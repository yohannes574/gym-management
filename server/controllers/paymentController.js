const mongoose = require("mongoose");
const crypto = require("crypto");
const { Readable } = require("stream");
const cloudinary = require("cloudinary").v2;

const Payment = require("../models/Payment");
const Member = require("../models/Member");
const Membership = require("../models/Membership");
const MembershipPlan = require("../models/MembershipPlan");
const Notification = require("../models/Notification");

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

const activateMembershipForPayment = async (payment) => {
  // plan/member may be raw ObjectIds or populated documents.
  const planId = payment.plan?._id || payment.plan;
  const memberId = payment.member?._id || payment.member;

  if (!planId) return null;

  const plan = await MembershipPlan.findById(planId);

  if (!plan) return null;

  // Find the member's currently active membership, if any.
  const activeMembership = await Membership.findOne({
    member: memberId,
    status: "active",
    endDate: { $gte: new Date() },
  }).sort({ endDate: -1 });

  // New membership starts after the active one ends, or today.
  const startDate = activeMembership
    ? new Date(activeMembership.endDate)
    : new Date();

  const endDate = new Date(startDate);

  endDate.setDate(endDate.getDate() + plan.duration);

  if (activeMembership) {
    // Extend the active membership by the new plan's duration.
    activeMembership.endDate = endDate;

    await activeMembership.save();

    // Link the payment to the membership it extended.
    payment.membership = activeMembership._id;

    await payment.save();

    return activeMembership;
  }

  const membership = await Membership.create({
    member: memberId,
    plan: plan._id,
    startDate,
    endDate,
    status: "active",
  });

  // Link the payment to the membership it created.
  payment.membership = membership._id;

  await payment.save();

  return membership;
};

/*
|--------------------------------------------------------------------------
| Notifies the member's login account about a payment update.
|--------------------------------------------------------------------------
*/

const notifyMemberUser = async (memberId, title, message) => {
  try {
    const member = await Member.findById(memberId).select("user");

    if (member?.user) {
      await Notification.create({
        recipient: member.user,
        type: "payment",
        title,
        message,
      });
    }
  } catch (error) {
    console.error("Payment notification error:", error.message);
  }
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

    const payment = await Payment.create({
      member: memberId,
      membership: membershipId || undefined,
      plan: planId || undefined,
      amount: paymentAmount,
      paymentMethod,
      proofImage: uploadedProof?.secure_url || null,
      proofImagePublicId: uploadedProof?.public_id || null,
      status:
        req.user.role === "member"
          ? "pending"
          : "paid",
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

    const {
      membershipId,
      planId,
      amount,
    } = req.body;

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

      const paymentAmountFromBody = Number(amount);

      if (
        !mongoose.isValidObjectId(membershipId) ||
        !Number.isFinite(paymentAmountFromBody) ||
        paymentAmountFromBody <= 0
      ) {
        return res.status(400).json({
          message:
            "A valid membership and positive amount are required.",
        });
      }

      paymentAmount = paymentAmountFromBody;

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

    const payment = await Payment.create({
      member: payingMember._id,
      membership: context
        ? context.membership._id
        : undefined,
      plan: plan ? plan._id : undefined,
      amount: paymentAmount,
      paymentMethod: "chapa",
      status: "pending",
      transactionReference,
    });

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
            `${clientUrl}/dashboard/member/payments?payment=${payment._id}&status=success`,

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
      await Payment.findByIdAndDelete(payment._id);

      return res.status(502).json({
        message:
          chapaData?.message ||
          "Chapa could not initialize the payment.",
      });
    }

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

    if (isSuccessful) {
      payment.status = "paid";
      payment.paymentDate = new Date();

      await payment.save();

      /*
      |--------------------------------------------------------------------------
      | Self-service plan payments activate/extend membership.
      |--------------------------------------------------------------------------
      */

      await activateMembershipForPayment(
        payment
      );
    }

    res
      .status(isSuccessful ? 200 : 400)
      .json({
        message: isSuccessful
          ? "Payment verified successfully."
          : "Payment could not be verified.",
        status: payment.status,
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

    if (payment.status === "paid") {
      return res.status(400).json({
        message:
          "This payment has already been confirmed.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | APPROVE
    |--------------------------------------------------------------------------
    */

    if (decision === "approved") {
      payment.status = "paid";
      payment.verifiedBy =
        req.user.userId;
      payment.verifiedAt = new Date();
      payment.rejectionReason = null;

      await payment.save();

      /*
      |--------------------------------------------------------------------------
      | Self-service payment activates/extends membership.
      |--------------------------------------------------------------------------
      */

      await activateMembershipForPayment(
        payment
      );

      await notifyMemberUser(
        payment.member._id ||
          payment.member,

        "Payment approved",

        payment.plan
          ? `Your ${payment.paymentMethod} payment of ${payment.amount} ETB was approved. Your ${planLabel(
              payment
            )} is now active. Welcome aboard!`
          : `Your ${payment.paymentMethod} payment of ${payment.amount} ETB was approved by the gym. Thank you!`
      );

      return res.json({
        message: payment.plan
          ? "Payment approved. The member's plan membership is now active."
          : "Payment approved and marked as paid.",

        payment,
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

    const proofPublicId =
      payment.proofImagePublicId;

    await removeProofFile(
      proofPublicId
    );

    /*
    |--------------------------------------------------------------------------
    | Delete payment record.
    |--------------------------------------------------------------------------
    */

    await Payment.findByIdAndDelete(
      payment._id
    );

    /*
    |--------------------------------------------------------------------------
    | Notify member.
    |--------------------------------------------------------------------------
    */

    await notifyMemberUser(
      memberId,

      "Payment rejected",

      `Your ${method} payment of ${amount} ETB was rejected.${
        reason
          ? ` Reason: ${reason}.`
          : ""
      } Please submit a new payment with a valid transfer screenshot.`
    );

    res.json({
      message:
        "Payment rejected and removed.",
    });
  } catch (error) {
    console.error(
      "Verify payment error:",
      error
    );

    res.status(500).json({
      message:
        "Server error while verifying payment.",
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