const mongoose = require("mongoose");
const crypto = require("crypto");
const { Readable } = require("stream");
const cloudinary = require("cloudinary").v2;

const Payment = require("../models/Payment");
const Member = require("../models/Member");
const Membership = require("../models/Membership");
const MembershipPlan = require("../models/MembershipPlan");
const {
  recordAuditEvent,
  withAuditTransaction,
} = require("../services/auditLogService");
const { enqueueMemberNotification } = require("../services/notificationOutboxService");
const {
  getMembershipExtensionDates,
  isMembershipCurrent,
} = require("../utils/membershipRules");

// Payment methods that members pay manually outside the platform.
// Members must attach a transfer screenshot for these; staff then
// verify the payment against the screenshot.
const MANUAL_PROOF_METHODS = ["bank", "telebirr"];

/*
|--------------------------------------------------------------------------
| Cloudinary
|--------------------------------------------------------------------------
| Configure Cloudinary when an upload/delete operation actually happens.
| This avoids problems caused by dotenv being loaded after modules are
| imported in server.js.
|--------------------------------------------------------------------------
*/

const configureCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
};

/*
|--------------------------------------------------------------------------
| Upload payment proof to Cloudinary
|--------------------------------------------------------------------------
*/

const uploadProofToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    configureCloudinary();

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "gym-management/payment-proofs",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
};

/*
|--------------------------------------------------------------------------
| Delete payment proof from Cloudinary
|--------------------------------------------------------------------------
*/

const removeProofFile = async (publicId) => {
  if (!publicId) return;

  try {
    configureCloudinary();

    await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      type: "upload",
    });
  } catch (error) {
    console.error(
      "Could not remove payment proof from Cloudinary:",
      error.message
    );
  }
};

/*
|--------------------------------------------------------------------------
| Resolves the logged-in member's gym profile.
|--------------------------------------------------------------------------
*/

const getMemberFromRequest = async (req) =>
  Member.findOne({ user: req.user.userId });

/*
|--------------------------------------------------------------------------
| Human-friendly plan name for notifications.
|--------------------------------------------------------------------------
*/

const planLabel = (payment) =>
  payment.plan?.name || "membership plan";

/*
|--------------------------------------------------------------------------
| Creates (or extends) the member's membership for a confirmed
| self-service payment.
|--------------------------------------------------------------------------
*/

const activateMembershipForPayment = async (payment, auditEvent) => {
  const session = await mongoose.startSession();
  let activated = false;

  try {
    await session.withTransaction(async () => {
      const currentPayment = await Payment.findById(
        payment._id
      ).session(session);

      if (!currentPayment || currentPayment.status === "rejected" || currentPayment.membershipActivatedAt) {
        return;
      }

      const now = new Date();
      let membership;
      let plan;

      if (currentPayment.membership) {
        membership = await Membership.findOne({
          _id: currentPayment.membership,
          member: currentPayment.member,
        }).session(session);

        if (!membership) return;

        plan = await MembershipPlan.findById(
          membership.plan
        ).session(session);

        if (!plan) return;

        const hasCurrentAccess = isMembershipCurrent(
          membership,
          now
        );
        const { startDate, endDate } =
          getMembershipExtensionDates(
            membership,
            plan.duration,
            now
          );

        if (!hasCurrentAccess) {
          membership.startDate = startDate;
        }
        membership.endDate = endDate;
        membership.status = "active";
      } else if (currentPayment.plan) {
        plan = await MembershipPlan.findById(
          currentPayment.plan
        ).session(session);

        if (!plan) return;

        membership = await Membership.findOne({
          member: currentPayment.member,
          status: "active",
          endDate: { $gte: now },
        })
          .sort({ endDate: -1 })
          .session(session);

        const { startDate, endDate } =
          getMembershipExtensionDates(
            membership,
            plan.duration,
            now
          );

        if (membership) {
          membership.plan = plan._id;
          membership.endDate = endDate;
        } else {
          membership = new Membership({
            member: currentPayment.member,
            plan: plan._id,
            startDate,
            endDate,
            status: "active",
          });
        }
      } else {
        return;
      }

      if (auditEvent?.action === "payment.approved") {
        currentPayment.status = "paid";
        currentPayment.verifiedBy = auditEvent.actor;
        currentPayment.verifiedAt = now;
        currentPayment.reviewedBy = auditEvent.actor;
        currentPayment.reviewedAt = now;
        currentPayment.rejectionReason = null;
      } else if (auditEvent?.action === "payment.chapa_confirmed") {
        currentPayment.status = "paid";
        currentPayment.paymentDate = now;
      }

      await membership.save({ session });
      currentPayment.membership = membership._id;
      currentPayment.membershipActivatedAt = now;
      await currentPayment.save({ session });

      if (auditEvent) {
        await recordAuditEvent({
          ...auditEvent,
          subjectType: "Payment",
          subjectId: currentPayment._id,
          member: currentPayment.member,
        }, { session });
      }

      if (auditEvent?.notification) {
        await enqueueMemberNotification(
          currentPayment.member,
          auditEvent.notification,
          session
        );
      }
      activated = true;
    });
  } finally {
    await session.endSession();
  }

  return activated;
};

/*
|--------------------------------------------------------------------------
| Build server base URL
|--------------------------------------------------------------------------
*/

const buildServerBaseUrl = (req) => {
  if (process.env.SERVER_URL) {
    return process.env.SERVER_URL.replace(/\/*$/, "");
  }

  const protocol =
    req.headers["x-forwarded-proto"] || req.protocol || "http";

  const host =
    req.headers.host || `localhost:${process.env.PORT || 5000}`;

  return `${protocol}://${host}`;
};

/*
|--------------------------------------------------------------------------
| Chapa verification
|--------------------------------------------------------------------------
*/

const isSuccessfulChapaVerification = (
  verifyResponse,
  verifyData,
  expectedAmount
) => {
  const verifiedAmount = Number(verifyData?.data?.amount);

  return Boolean(
    verifyResponse?.ok &&
      verifyData?.status === "success" &&
      verifyData?.data?.status === "success" &&
      Number.isFinite(verifiedAmount) &&
      verifiedAmount === Number(expectedAmount)
  );
};

/*
|--------------------------------------------------------------------------
| Get member payment context
|--------------------------------------------------------------------------
*/

const getMemberPaymentContext = async (req, membershipId) => {
  const member = await Member.findOne({
    user: req.user.userId,
  });

  if (!member) {
    return {
      error: {
        status: 404,
        message:
          "No gym profile is linked to your account. Please contact the gym.",
      },
    };
  }

  if (!mongoose.isValidObjectId(membershipId)) {
    return {
      error: {
        status: 400,
        message: "Invalid membership ID.",
      },
    };
  }

  const membership = await Membership.findById(
    membershipId
  ).populate("plan", "name price");

  if (!membership) {
    return {
      error: {
        status: 404,
        message: "Membership not found.",
      },
    };
  }

  if (
    membership.member.toString() !==
    member._id.toString()
  ) {
    return {
      error: {
        status: 403,
        message: "This membership does not belong to you.",
      },
    };
  }

  return {
    member,
    membership,
  };
};

/*
|--------------------------------------------------------------------------
| GET payments
|--------------------------------------------------------------------------
| Staff: see all payments
| Members: see only their own
|--------------------------------------------------------------------------
*/

const getPayments = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === "member") {
      const self = await Member.findOne({
        user: req.user.userId,
      });

      if (!self) {
        return res.json([]);
      }

      filter.member = self._id;
    }

    const payments = await Payment.find(filter)
      .populate("member", "name email")
      .populate("plan", "name price duration")
      .populate("reviewedBy", "name")
      .populate({
        path: "membership",
        populate: {
          path: "plan",
          select: "name price",
        },
      })
      .sort({ paymentDate: -1 });

    res.json(payments);
  } catch (error) {
    console.error("Get payments error:", error);

    res.status(500).json({
      message: "Server error while getting payments.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET single payment by id
|--------------------------------------------------------------------------
*/

const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate("member", "name email phone")
      .populate("plan", "name price duration")
      .populate("reviewedBy", "name")
      .populate({
        path: "membership",
        populate: {
          path: "plan",
          select: "name price duration",
        },
      });

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found.",
      });
    }

    // Members can only see their own payments.
    if (req.user.role === "member") {
      const self = await Member.findOne({
        user: req.user.userId,
      });

      const ownerId = payment.member?._id
        ? payment.member._id.toString()
        : String(payment.member);

      if (!self || ownerId !== self._id.toString()) {
        return res.status(403).json({
          message: "You can only view your own payments.",
        });
      }
    }

    res.json(payment);
  } catch (error) {
    console.error("Get payment error:", error);

    res.status(500).json({
      message: "Server error while getting payment.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| CREATE payment
|--------------------------------------------------------------------------
| Staff create confirmed (paid) payments directly.
|
| Members submit a payment request (pending).
| For bank/Telebirr, a screenshot is required.
|--------------------------------------------------------------------------
*/

const createPayment = async (req, res) => {
  let uploadedProof = null;

  try {
    const {
      memberId: bodyMemberId,
      membershipId,
      planId,
      amount,
      paymentMethod,
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Members can only pay for themselves.
    |--------------------------------------------------------------------------
    */

    let memberId = bodyMemberId;

    if (req.user.role === "member") {
      const self = await Member.findOne({
        user: req.user.userId,
      });

      if (!self) {
        return res.status(404).json({
          message:
            "No gym profile is linked to your account. Please contact the gym.",
        });
      }

      memberId = self._id.toString();
    }

    /*
    |--------------------------------------------------------------------------
    | Validate member
    |--------------------------------------------------------------------------
    */

    if (!memberId) {
      return res.status(400).json({
        message: "Member is required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Determine self-service payment
    |--------------------------------------------------------------------------
    */

    const isMemberSelfService =
      req.user.role === "member" &&
      !membershipId &&
      !!planId;

    if (!membershipId && !planId) {
      return res.status(400).json({
        message: "A membership or a plan is required.",
      });
    }

    if (membershipId && planId) {
      return res.status(400).json({
        message:
          "Provide either a membership or a plan, not both.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate member ID
    |--------------------------------------------------------------------------
    */

    if (!mongoose.isValidObjectId(memberId)) {
      return res.status(400).json({
        message: "Invalid member ID.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate membership / plan ID
    |--------------------------------------------------------------------------
    */

    if (
      (membershipId &&
        !mongoose.isValidObjectId(membershipId)) ||
      (planId && !mongoose.isValidObjectId(planId))
    ) {
      return res.status(400).json({
        message: "Invalid membership or plan ID.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Calculate payment amount
    |--------------------------------------------------------------------------
    */

    let paymentAmount;

    if (isMemberSelfService) {
      const plan = await MembershipPlan.findById(planId);

      if (!plan) {
        return res.status(404).json({
          message: "Membership plan not found.",
        });
      }

      if (plan.active === false) {
        return res.status(400).json({
          message: "This plan is no longer available.",
        });
      }

      // Never trust amount sent by the browser.
      paymentAmount = plan.price;
    } else {
      if (amount === undefined) {
        return res.status(400).json({
          message: "Amount is required.",
        });
      }

      paymentAmount = Number(amount);

      if (Number.isNaN(paymentAmount)) {
        return res.status(400).json({
          message:
            "Payment amount must be a valid number.",
        });
      }

      if (paymentAmount <= 0) {
        return res.status(400).json({
          message:
            "Payment amount must be greater than zero.",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Staff recording payment against a plan
    |--------------------------------------------------------------------------
    */

    if (planId && !isMemberSelfService) {
      const planExists = await MembershipPlan.findById(planId);

      if (!planExists) {
        return res.status(404).json({
          message: "Membership plan not found.",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Check member exists
    |--------------------------------------------------------------------------
    */

    const member = await Member.findById(memberId);

    if (!member) {
      return res.status(404).json({
        message: "Member not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check membership
    |--------------------------------------------------------------------------
    */

    if (membershipId) {
      const membership =
        await Membership.findById(membershipId);

      if (!membership) {
        return res.status(404).json({
          message: "Membership not found.",
        });
      }

      if (
        membership.member.toString() !==
        memberId.toString()
      ) {
        return res.status(400).json({
          message:
            "This membership does not belong to the selected member.",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Validate payment proof requirement
    |--------------------------------------------------------------------------
    */

    const hasProofFile = Boolean(req.file);

    if (
      req.user.role === "member" &&
      MANUAL_PROOF_METHODS.includes(paymentMethod) &&
      !hasProofFile
    ) {
      return res.status(400).json({
        message:
          "A screenshot of your transfer is required for bank and Telebirr payments.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Upload proof to Cloudinary
    |--------------------------------------------------------------------------
    |
    | Important:
    | We only upload AFTER all validation above succeeds.
    | This prevents unnecessary Cloudinary uploads for invalid requests.
    |--------------------------------------------------------------------------
    */

    if (req.file) {
      uploadedProof = await uploadProofToCloudinary(
        req.file.buffer
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Create payment
    |--------------------------------------------------------------------------
    */

    const payment = await withAuditTransaction(async (session) => {
      const [createdPayment] = await Payment.create(
        [{
          member: memberId,
          membership: membershipId || undefined,
          plan: planId || undefined,
          amount: paymentAmount,
          paymentMethod,
          proofImage: uploadedProof?.secure_url || null,
          proofImagePublicId: uploadedProof?.public_id || null,
          status: req.user.role === "member" ? "pending" : "paid",
        }],
        { session }
      );

      await recordAuditEvent({
        actor: req.user.userId,
        actorRole: req.user.role,
        action: "payment.created",
        subjectType: "Payment",
        subjectId: createdPayment._id,
        member: member._id,
        summary: `Payment of ${paymentAmount} ETB recorded as ${createdPayment.status}.`,
        metadata: {
          amount: paymentAmount,
          paymentMethod,
          status: createdPayment.status,
        },
      }, { session });

      return createdPayment;
    });

    /*
    |--------------------------------------------------------------------------
    | Populate payment information
    |--------------------------------------------------------------------------
    */

    const populatedPayment =
      await Payment.findById(payment._id)
        .populate("member", "name email")
        .populate("plan", "name price duration")
        .populate({
          path: "membership",
          populate: {
            path: "plan",
            select: "name price",
          },
        });

    res.status(201).json(populatedPayment);
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | If Cloudinary upload succeeded but database creation failed,
    | remove the uploaded image so we don't leave an orphaned file.
    |--------------------------------------------------------------------------
    */

    if (uploadedProof?.public_id) {
      await removeProofFile(uploadedProof.public_id);
    }

    console.error("Create payment error:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (err) => err.message
      );

      return res.status(400).json({
        message: messages.join(", "),
      });
    }

    res.status(500).json({
      message: "Server error while creating payment.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| POST /api/payments/chapa/initialize
|--------------------------------------------------------------------------
*/

const initializeChapaPayment = async (req, res) => {
  try {
    if (!process.env.CHAPA_SECRET_KEY) {
      return res.status(503).json({
        message:
          "Chapa payments are not configured on the server.",
      });
    }

    const { membershipId, planId } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Exactly one must be provided.
    |--------------------------------------------------------------------------
    */

    if (!membershipId && !planId) {
      return res.status(400).json({
        message: "A plan or membership is required.",
      });
    }

    if (membershipId && planId) {
      return res.status(400).json({
        message:
          "Provide either a plan or a membership, not both.",
      });
    }

    let context = null;
    let plan = null;
    let paymentAmount;

    /*
    |--------------------------------------------------------------------------
    | Plan payment
    |--------------------------------------------------------------------------
    */

    if (planId) {
      if (!mongoose.isValidObjectId(planId)) {
        return res.status(400).json({
          message: "Invalid plan ID.",
        });
      }

      plan = await MembershipPlan.findById(planId);

      if (!plan || plan.active === false) {
        return res.status(400).json({
          message:
            "This plan is no longer available.",
        });
      }

      paymentAmount = plan.price;
    } else {
      /*
      |--------------------------------------------------------------------------
      | Membership renewal
      |--------------------------------------------------------------------------
      */

      if (!mongoose.isValidObjectId(membershipId)) {
        return res.status(400).json({
          message:
            "A valid membership is required.",
        });
      }

      context = await getMemberPaymentContext(
        req,
        membershipId
      );

      if (context.error) {
        return res
          .status(context.error.status)
          .json({
            message: context.error.message,
          });
      }

      paymentAmount = context.membership.plan?.price;

      if (!Number.isFinite(Number(paymentAmount)) || paymentAmount <= 0) {
        return res.status(400).json({
          message: "The membership plan has an invalid price.",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Resolve paying member
    |--------------------------------------------------------------------------
    */

    const payingMember = context
      ? context.member
      : await getMemberFromRequest(req);

    if (!payingMember) {
      return res.status(404).json({
        message:
          "No gym profile is linked to your account. Please contact the gym.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Create transaction reference
    |--------------------------------------------------------------------------
    */

    const transactionReference =
      `gym_${crypto.randomUUID()}`;

    /*
    |--------------------------------------------------------------------------
    | Prepare Chapa customer data
    |--------------------------------------------------------------------------
    */

    const nameParts = payingMember.name
      .trim()
      .split(/\s+/);

    const firstName =
      nameParts.shift() || "Gym";

    const lastName =
      nameParts.join(" ") || "Member";

    const serverUrl = buildServerBaseUrl(req);

    const clientUrl =
      process.env.CLIENT_URL ||
      "http://localhost:5173";

    /*
    |--------------------------------------------------------------------------
    | Initialize Chapa
    |--------------------------------------------------------------------------
    */

    const chapaResponse = await fetch(
      "https://api.chapa.co/v1/transaction/initialize",
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          amount: String(paymentAmount),
          currency: "ETB",
          email: payingMember.email,
          first_name: firstName,
          last_name: lastName,
          tx_ref: transactionReference,

          callback_url:
            `${serverUrl}/api/payments/chapa/callback`,

          return_url:
            `${clientUrl}/dashboard/member/payments?payment=${encodeURIComponent(transactionReference)}&status=success`,

          customization: {
            title: "Gym membership payment",

            description: plan
              ? plan.name
              : context.membership.plan?.name ||
                "Membership payment",
          },
        }),
      }
    );

    const chapaData =
      await chapaResponse.json();

    const checkoutUrl =
      chapaData?.data?.checkout_url;

    if (!chapaResponse.ok || !checkoutUrl) {
      return res.status(502).json({
        message:
          chapaData?.message ||
          "Chapa could not initialize the payment.",
      });
    }

    const payment = await withAuditTransaction(async (session) => {
      const [createdPayment] = await Payment.create(
        [{
          member: payingMember._id,
          membership: context ? context.membership._id : undefined,
          plan: plan ? plan._id : undefined,
          amount: paymentAmount,
          paymentMethod: "chapa",
          status: "pending",
          transactionReference,
        }],
        { session }
      );

      await recordAuditEvent({
        actor: req.user.userId,
        actorRole: req.user.role,
        action: "payment.initialized",
        subjectType: "Payment",
        subjectId: createdPayment._id,
        member: payingMember._id,
        summary: `Chapa checkout initialized for ${createdPayment.amount} ETB.`,
        metadata: {
          amount: createdPayment.amount,
          paymentMethod: "chapa",
          transactionReference,
        },
      }, { session });

      return createdPayment;
    });

    res.status(201).json({
      paymentId: payment._id,
      checkoutUrl,
    });
  } catch (error) {
    console.error(
      "Chapa initialization error:",
      error
    );

    res.status(502).json({
      message: "Could not connect to Chapa.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Chapa callback
|--------------------------------------------------------------------------
| Chapa callback does NOT automatically trust the callback.
| The server verifies the transaction with Chapa first.
|--------------------------------------------------------------------------
*/

const chapaCallback = async (req, res) => {
  try {
    const transactionReference =
      req.query.trx_ref ||
      req.body?.trx_ref ||
      req.query.tx_ref;

    if (
      !transactionReference ||
      !process.env.CHAPA_SECRET_KEY
    ) {
      return res.status(400).json({
        message: "Invalid Chapa callback.",
      });
    }

    const payment = await Payment.findOne({
      transactionReference,
      paymentMethod: "chapa",
    });

    if (!payment) {
      return res.status(404).json({
        message:
          "Payment transaction not found.",
      });
    }

    if (payment.membershipActivatedAt) {
      return res.json({
        message: "Payment and membership are already confirmed.",
        status: payment.status,
      });
    }

    const verifyResponse = await fetch(
      `https://api.chapa.co/v1/transaction/verify/${encodeURIComponent(
        transactionReference
      )}`,
      {
        headers: {
          Authorization:
            `Bearer ${process.env.CHAPA_SECRET_KEY}`,
        },
      }
    );

    const verifyData =
      await verifyResponse.json();

    const isSuccessful =
      isSuccessfulChapaVerification(
        verifyResponse,
        verifyData,
        payment.amount
      );

    let confirmedPayment = payment;

    if (isSuccessful) {
      const activated = await activateMembershipForPayment(payment, {
        actor: null,
        actorRole: "system",
        action: "payment.chapa_confirmed",
        summary: `Chapa confirmed payment of ${payment.amount} ETB.`,
        metadata: {
          amount: payment.amount,
          transactionReference: payment.transactionReference,
        },
        notification: {
          eventKey: `payment-chapa-confirmed:${payment._id}`,
          type: "payment",
          title: "Payment confirmed",
          message: `Your Chapa payment of ${payment.amount} ETB was confirmed. Your membership is now active.`,
        },
      });

      if (!activated) {
        confirmedPayment = await Payment.findById(payment._id);
      }

      if (!activated && !confirmedPayment?.membershipActivatedAt) {
        return res.status(409).json({
          message: "Payment confirmation could not be applied to a membership.",
          status: payment.status,
        });
      }

      if (activated) {
        confirmedPayment = await Payment.findById(payment._id);
      }
    }

    res
      .status(isSuccessful ? 200 : 400)
      .json({
        message: isSuccessful
          ? "Payment verified successfully."
          : "Payment could not be verified.",
        status: confirmedPayment.status,
      });
  } catch (error) {
    console.error(
      "Chapa callback error:",
      error
    );

    res.status(502).json({
      message:
        "Could not verify the Chapa payment.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/payments/:id/proof
|--------------------------------------------------------------------------
|
| Payment proof is stored in Cloudinary.
|
| We do NOT simply redirect the browser to the Cloudinary URL.
| Instead, the server first checks authorization and then proxies
| the image through this authenticated endpoint.
|--------------------------------------------------------------------------
*/

const getPaymentProof = async (req, res) => {
  try {
    const payment = await Payment.findById(
      req.params.id
    );

    if (!payment || !payment.proofImage) {
      return res.status(404).json({
        message:
          "No payment proof found for this payment.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Members may only view their own proof.
    |--------------------------------------------------------------------------
    */

    if (req.user.role === "member") {
      const self = await Member.findOne({
        user: req.user.userId,
      });

      const ownerId = payment.member?._id
        ? payment.member._id.toString()
        : String(payment.member);

      if (
        !self ||
        ownerId !== self._id.toString()
      ) {
        return res.status(403).json({
          message:
            "You can only view your own payment proof.",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Fetch image from Cloudinary.
    |--------------------------------------------------------------------------
    */

    const imageResponse = await fetch(
      payment.proofImage
    );

    if (!imageResponse.ok || !imageResponse.body) {
      return res.status(404).json({
        message:
          "Payment proof image could not be retrieved.",
      });
    }

    const contentType =
      imageResponse.headers.get(
        "content-type"
      ) || "image/jpeg";

    res.set("Content-Type", contentType);

    const contentLength =
      imageResponse.headers.get(
        "content-length"
      );

    if (contentLength) {
      res.set("Content-Length", contentLength);
    }

    /*
    |--------------------------------------------------------------------------
    | Convert Web ReadableStream to Node stream.
    |--------------------------------------------------------------------------
    */

    Readable.fromWeb(
      imageResponse.body
    ).pipe(res);
  } catch (error) {
    console.error(
      "Get payment proof error:",
      error
    );

    res.status(500).json({
      message:
        "Server error while getting payment proof.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| PATCH /api/payments/:id/verify
|--------------------------------------------------------------------------
|
| Staff decision on a pending payment:
|
| approved -> paid
| rejected -> payment deleted + Cloudinary proof deleted
|--------------------------------------------------------------------------
*/

const verifyPayment = async (req, res) => {
  try {
    /*
    |--------------------------------------------------------------------------
    | Only staff can verify.
    |--------------------------------------------------------------------------
    */

    if (req.user.role === "member") {
      return res.status(403).json({
        message:
          "Only staff can verify payments.",
      });
    }

    const {
      decision,
      reason,
    } = req.body;

    if (
      !["approved", "rejected"].includes(
        decision
      )
    ) {
      return res.status(400).json({
        message:
          "Decision must be either 'approved' or 'rejected'.",
      });
    }

    const payment = await Payment.findById(
      req.params.id
    )
      .populate(
        "member",
        "name email"
      )
      .populate(
        "plan",
        "name price duration"
      );

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found.",
      });
    }

    const alreadyPaid = payment.status === "paid";

    if (
      payment.status === "rejected" ||
      (alreadyPaid &&
        (payment.membershipActivatedAt || decision === "rejected"))
    ) {
      return res.status(400).json({
        message:
          payment.status === "rejected"
            ? "This payment was rejected. Submit a new payment for review."
            : "This payment has already been confirmed.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | APPROVE
    |--------------------------------------------------------------------------
    */

    if (decision === "approved") {
      const memberId = payment.member._id || payment.member;
      const activated = await activateMembershipForPayment(payment, {
        actor: req.user.userId,
        actorRole: req.user.role,
        action: "payment.approved",
        summary: `Payment of ${payment.amount} ETB approved.`,
        metadata: {
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
        },
        notification: {
          eventKey: `payment-approved:${payment._id}`,
          type: "payment",
          title: "Payment approved",
          message: payment.plan
            ? `Your ${payment.paymentMethod} payment of ${payment.amount} ETB was approved. Your ${planLabel(payment)} is now active. Welcome aboard!`
            : `Your ${payment.paymentMethod} payment of ${payment.amount} ETB was approved by the gym. Thank you!`,
        },
      });

      if (!activated) {
        const confirmedPayment = await Payment.findById(payment._id)
          .populate("member", "name email")
          .populate("plan", "name price duration");

        if (confirmedPayment?.membershipActivatedAt) {
          return res.json({
            message: "Payment and membership are already confirmed.",
            payment: confirmedPayment,
          });
        }

        return res.status(409).json({
          message: "Payment could not be applied to a membership. No changes were saved.",
        });
      }

      const confirmedPayment = await Payment.findById(payment._id)
        .populate("member", "name email")
        .populate("plan", "name price duration");

      return res.json({
        message: payment.plan
          ? "Payment approved. The member's plan membership is now active."
          : "Payment approved and marked as paid.",

        payment: confirmedPayment,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | REJECT
    |--------------------------------------------------------------------------
    |
    | Delete the Cloudinary image first.
    |--------------------------------------------------------------------------
    */

    const memberId =
      payment.member?._id ||
      payment.member;

    const method =
      payment.paymentMethod;

    const amount =
      payment.amount;

    const rejectionReason =
      typeof reason === "string" ? reason.trim().slice(0, 500) : "";

    const rejectedPayment = await withAuditTransaction(async (session) => {
      const currentPayment = await Payment.findById(payment._id).session(session);
      if (!currentPayment || currentPayment.status !== "pending") {
        const error = new Error("Payment is no longer pending review.");
        error.statusCode = 409;
        throw error;
      }

      currentPayment.status = "rejected";
      currentPayment.reviewedBy = req.user.userId;
      currentPayment.reviewedAt = new Date();
      currentPayment.rejectionReason = rejectionReason || null;
      await currentPayment.save({ session });

      await recordAuditEvent({
        actor: req.user.userId,
        actorRole: req.user.role,
        action: "payment.rejected",
        subjectType: "Payment",
        subjectId: currentPayment._id,
        member: memberId,
        summary: `Payment of ${amount} ETB rejected.`,
        metadata: {
          amount,
          paymentMethod: method,
          rejectionReason: rejectionReason || null,
        },
      }, { session });

      await enqueueMemberNotification(memberId, {
        eventKey: `payment-rejected:${currentPayment._id}`,
        type: "payment",
        title: "Payment rejected",
        message: `Your ${method} payment of ${amount} ETB was rejected.${
          rejectionReason ? ` Reason: ${rejectionReason}.` : ""
        } Please submit a new payment with a valid transfer screenshot.`,
      }, session);

      return currentPayment;
    });

    res.json({
      message: "Payment rejected and retained in payment history.",
      payment: rejectedPayment,
    });
  } catch (error) {
    console.error(
      "Verify payment error:",
      error
    );

    res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Server error while verifying payment.",
    });
  }
};

module.exports = {
  getPayments,
  getPaymentById,
  createPayment,
  initializeChapaPayment,
  chapaCallback,
  getPaymentProof,
  verifyPayment,
};