const assert = require("node:assert/strict");
const { after, afterEach, before, describe, it } = require("node:test");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const testMongoUri = process.env.TEST_MONGO_URI;
if (process.env.CI === "true" && !testMongoUri) {
  throw new Error(
    "TEST_MONGO_URI must be configured in CI; refusing to skip integration tests."
  );
}

process.env.JWT_SECRET = "phase-two-integration-test-secret";
process.env.CHAPA_SECRET_KEY = "phase-two-chapa-test-secret";

const app = require("../app");
const User = require("../models/User");
const Member = require("../models/Member");
const Membership = require("../models/Membership");
const MembershipPlan = require("../models/MembershipPlan");
const Attendance = require("../models/Attendance");
const Notification = require("../models/Notification");
const NotificationOutbox = require("../models/NotificationOutbox");
const TrainerAssignment = require("../models/TrainerAssignment");
const TrainingSession = require("../models/TrainingSession");
const Payment = require("../models/Payment");
const AuditLog = require("../models/AuditLog");
const { processMembershipLifecycle } = require("../jobs/membershipLifecycle");
const {
  processNotificationOutbox,
} = require("../services/notificationOutboxService");
const {
  recordAuditEvent,
  withAuditTransaction,
} = require("../services/auditLogService");

const databaseModels = [
  User,
  Member,
  Membership,
  MembershipPlan,
  Attendance,
  Notification,
  NotificationOutbox,
  TrainerAssignment,
  TrainingSession,
  Payment,
  AuditLog,
];

describe(
  "membership lifecycle API integration",
  { skip: !testMongoUri, concurrency: false },
  () => {
    let server;
    let baseUrl;

    before(async () => {
      assert.notEqual(
        testMongoUri,
        process.env.MONGO_URI,
        "TEST_MONGO_URI must not point at the application database"
      );
      const databaseName = new URL(testMongoUri).pathname
        .slice(1)
        .toLowerCase();
      assert.match(
        databaseName,
        /test/,
        "TEST_MONGO_URI must use a database name containing 'test'"
      );

      await mongoose.connect(testMongoUri);
      await Promise.all(databaseModels.map((model) => model.init()));

      server = app.listen(0, "127.0.0.1");
      await new Promise((resolve) => server.once("listening", resolve));
      baseUrl = `http://127.0.0.1:${server.address().port}`;
    });

    after(async () => {
      if (server) {
        await new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
      }
      await mongoose.disconnect();
    });

    afterEach(async () => {
      await Promise.all(databaseModels.map((model) => model.deleteMany({})));
    });

    const createUser = (role, suffix) =>
      User.create({
        name: `Test ${role}`,
        email: `${role}-${suffix}@example.test`,
        password: "integration-password",
        role,
      });

    const createMember = async ({ user, suffix, status = "active" }) =>
      Member.create({
        user: user?._id || null,
        name: `Test Member ${suffix}`,
        email: `member-${suffix}@example.test`,
        phone: "5550100",
        status,
      });

    const createPlan = () =>
      MembershipPlan.create({
        name: "Test monthly plan",
        price: 100,
        duration: 30,
      });

    const tokenFor = (user) =>
      jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

    const request = async (method, path, token, body) => {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      return {
        status: response.status,
        body: await response.json(),
      };
    };

    it("expires old memberships and creates one reminder per expiry", async () => {
      const now = new Date("2026-09-30T00:00:00.000Z");
      const account = await createUser("member", "reminder");
      const expiringMember = await createMember({
        user: account,
        suffix: "reminder",
      });
      const expiredMember = await createMember({ suffix: "expired" });
      const plan = await createPlan();

      const expiringMembership = await Membership.create({
        member: expiringMember._id,
        plan: plan._id,
        startDate: new Date("2026-09-01T00:00:00.000Z"),
        endDate: new Date("2026-10-05T00:00:00.000Z"),
        status: "active",
      });
      const oldMembership = await Membership.create({
        member: expiredMember._id,
        plan: plan._id,
        startDate: new Date("2026-08-01T00:00:00.000Z"),
        endDate: new Date("2026-09-29T00:00:00.000Z"),
        status: "active",
      });

      const firstRun = await processMembershipLifecycle(now);
      const secondRun = await processMembershipLifecycle(now);

      assert.equal(firstRun.expiredCount, 1);
      assert.equal(firstRun.remindersCreated, 1);
      assert.equal(secondRun.expiredCount, 0);
      assert.equal(secondRun.remindersCreated, 0);
      assert.equal(
        (await Membership.findById(oldMembership._id)).status,
        "expired"
      );
      assert.equal(
        await NotificationOutbox.countDocuments({
          eventKey: `membership-expiring:${expiringMembership._id}:${new Date(expiringMembership.endDate).getTime()}`,
        }),
        1
      );
      const firstDelivery = await processNotificationOutbox();
      const secondDelivery = await processNotificationOutbox();
      assert.equal(firstDelivery.delivered, 1);
      assert.equal(secondDelivery.delivered, 0);
      assert.equal(
        await Notification.countDocuments({ recipient: account._id }),
        1
      );
      assert.ok(await Membership.findById(expiringMembership._id));
    });

    it("rolls back a business write when its audit event cannot be saved", async () => {
      const memberId = new mongoose.Types.ObjectId();
      const memberEmail = `rollback-${memberId}@example.test`;

      await assert.rejects(
        withAuditTransaction(async (session) => {
          await Member.create(
            [{
              _id: memberId,
              name: "Rollback Member",
              email: memberEmail,
              phone: "5550100",
            }],
            { session }
          );

          await recordAuditEvent({
            actorRole: "owner",
            action: "invalid.action",
            subjectType: "Member",
            subjectId: memberId,
            member: memberId,
            summary: "This invalid event should abort the transaction.",
          }, { session });
        })
      );

      assert.equal(await Member.findById(memberId), null);
    });

    it("retries a failed outbox delivery and completes it once", async () => {
      const recipient = await createUser("member", "outbox-retry");
      const outboxEvent = await NotificationOutbox.create({
        eventKey: "test-notification-retry-once",
        recipient: recipient._id,
        type: "payment",
        title: "Payment update",
        message: "Your payment was updated.",
      });
      const originalUpdateOne = Notification.updateOne;
      let failFirstDelivery = true;

      Notification.updateOne = async (...args) => {
        if (failFirstDelivery) {
          failFirstDelivery = false;
          throw new Error("temporary notification store failure");
        }

        return originalUpdateOne.apply(Notification, args);
      };

      try {
        const firstRun = await processNotificationOutbox();
        const retryState = await NotificationOutbox.findById(outboxEvent._id);

        assert.equal(firstRun.attempted, 1);
        assert.equal(firstRun.delivered, 0);
        assert.equal(retryState.attempts, 1);
        assert.match(retryState.lastError, /temporary notification store failure/);
        assert.ok(retryState.nextAttemptAt > new Date());

        await NotificationOutbox.updateOne(
          { _id: outboxEvent._id },
          { $set: { nextAttemptAt: new Date(Date.now() - 1000) } }
        );

        const secondRun = await processNotificationOutbox();
        assert.equal(secondRun.attempted, 1);
        assert.equal(secondRun.delivered, 1);
        assert.equal(
          await Notification.countDocuments({ dedupeKey: outboxEvent.eventKey }),
          1
        );

        const completedEvent = await NotificationOutbox.findById(outboxEvent._id);
        assert.ok(completedEvent.deliveredAt);
        assert.equal(completedEvent.lockToken, null);
      } finally {
        Notification.updateOne = originalUpdateOne;
      }
    });

    it("requires a current membership for check-in and blocks unpaid renewal", async () => {
      const owner = await createUser("owner", "access");
      const memberAccount = await createUser("member", "access");
      const member = await createMember({
        user: memberAccount,
        suffix: "access",
      });
      const plan = await createPlan();
      const membership = await Membership.create({
        member: member._id,
        plan: plan._id,
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-01-02T00:00:00.000Z"),
        status: "active",
      });

      const ownerToken = tokenFor(owner);
      const memberToken = tokenFor(memberAccount);
      const deniedCheckIn = await request(
        "POST",
        "/api/attendance",
        ownerToken,
        { memberId: member._id }
      );
      const shortReasonOverride = await request(
        "POST",
        "/api/attendance",
        ownerToken,
        { memberId: member._id, overrideReason: "ok" }
      );
      const deniedRenewal = await request(
        "PUT",
        `/api/memberships/${membership._id}/renew`,
        memberToken
      );

      assert.equal(deniedCheckIn.status, 403);
      assert.equal(shortReasonOverride.status, 400);
      assert.equal(deniedRenewal.status, 403);
      assert.equal(
        (await Membership.findById(membership._id)).endDate.toISOString(),
        "2026-01-02T00:00:00.000Z"
      );

      const overrideReason = "Owner approved a one-day grace period.";
      const approvedOverride = await request(
        "POST",
        "/api/attendance",
        ownerToken,
        { memberId: member._id, overrideReason }
      );
      assert.equal(approvedOverride.status, 201);
      assert.equal(approvedOverride.body.isOverride, true);
      assert.equal(approvedOverride.body.overrideReason, overrideReason);
      assert.equal(
        approvedOverride.body.overrideBy._id.toString(),
        owner._id.toString()
      );

      const overrideAudit = await AuditLog.findOne({
        action: "attendance.override",
        subjectId: approvedOverride.body._id,
      });
      assert.equal(overrideAudit.actor.toString(), owner._id.toString());
      assert.equal(overrideAudit.metadata.reason, overrideReason);

      const duplicateOverride = await request(
        "POST",
        "/api/attendance",
        ownerToken,
        { memberId: member._id, overrideReason }
      );
      assert.equal(duplicateOverride.status, 400);

      const inactiveMember = await createMember({
        suffix: "inactive-override",
        status: "inactive",
      });
      const inactiveOverride = await request(
        "POST",
        "/api/attendance",
        ownerToken,
        {
          memberId: inactiveMember._id,
          overrideReason: "Owner approved this exception.",
        }
      );
      assert.equal(inactiveOverride.status, 403);

      const memberOverride = await request(
        "POST",
        "/api/attendance",
        memberToken,
        {
          memberId: member._id,
          overrideReason: "Member cannot approve own access.",
        }
      );
      assert.equal(memberOverride.status, 403);
    });

    it("archives records without deleting history and allows staff restoration", async () => {
      const owner = await createUser("owner", "archive");
      const memberAccount = await createUser("member", "archive");
      const trainer = await createUser("trainer", "archive");
      const member = await createMember({
        user: memberAccount,
        suffix: "archive",
      });
      const plan = await createPlan();
      const membership = await Membership.create({
        member: member._id,
        plan: plan._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "active",
      });
      const assignment = await TrainerAssignment.create({
        trainer: trainer._id,
        member: member._id,
        assignedBy: owner._id,
      });
      const session = await TrainingSession.create({
        trainer: trainer._id,
        member: member._id,
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        activity: "Training session",
      });

      const ownerToken = tokenFor(owner);
      const memberToken = tokenFor(memberAccount);
      const archived = await request(
        "DELETE",
        `/api/members/${member._id}`,
        ownerToken
      );

      assert.equal(archived.status, 200);
      assert.ok(archived.body.member.archivedAt);
      assert.equal((await Member.findById(member._id)).status, "inactive");
      assert.ok(await User.findById(memberAccount._id));
      assert.equal((await Membership.findById(membership._id)).status, "cancelled");
      assert.equal((await TrainerAssignment.findById(assignment._id)).status, "inactive");
      assert.equal((await TrainingSession.findById(session._id)).status, "cancelled");
      assert.equal(
        (await request("GET", "/api/portal/member", memberToken)).status,
        403
      );

      const archivedList = await request(
        "GET",
        "/api/members?includeArchived=true",
        ownerToken
      );
      assert.equal(archivedList.status, 200);
      assert.equal(archivedList.body.length, 1);

      const restored = await request(
        "PUT",
        `/api/members/${member._id}`,
        ownerToken,
        {
          name: member.name,
          email: member.email,
          phone: member.phone,
          status: "active",
        }
      );

      assert.equal(restored.status, 200);
      assert.equal(restored.body.archivedAt, null);
      assert.equal(
        await AuditLog.countDocuments({
          member: member._id,
          action: { $in: ["member.archived", "member.restored"] },
        }),
        2
      );
      assert.equal(
        (await request("GET", "/api/portal/member", memberToken)).status,
        200
      );
    });

    it("retains rejected payment history and prevents later approval", async () => {
      const owner = await createUser("owner", "reject-payment");
      const memberAccount = await createUser("member", "reject-payment");
      const member = await createMember({
        user: memberAccount,
        suffix: "reject-payment",
      });
      const plan = await createPlan();
      const payment = await Payment.create({
        member: member._id,
        plan: plan._id,
        amount: plan.price,
        paymentMethod: "bank",
        status: "pending",
        proofImage: "https://proof.example.test/transfer.png",
        proofImagePublicId: "test/transfer-proof",
      });
      const ownerToken = tokenFor(owner);
      const memberToken = tokenFor(memberAccount);

      const rejected = await request(
        "PATCH",
        `/api/payments/${payment._id}/verify`,
        ownerToken,
        { decision: "rejected", reason: "Transfer amount does not match." }
      );
      const savedPayment = await Payment.findById(payment._id);

      assert.equal(rejected.status, 200);
      assert.equal(savedPayment.status, "rejected");
      assert.equal(savedPayment.rejectionReason, "Transfer amount does not match.");
      assert.equal(savedPayment.reviewedBy.toString(), owner._id.toString());
      assert.ok(savedPayment.reviewedAt);
      assert.equal(savedPayment.proofImagePublicId, "test/transfer-proof");
      await processNotificationOutbox();
      await processNotificationOutbox();
      assert.equal(
        await Notification.countDocuments({ recipient: memberAccount._id }),
        1
      );
      assert.equal(
        await NotificationOutbox.countDocuments({
          eventKey: `payment-rejected:${payment._id}`,
          deliveredAt: { $ne: null },
        }),
        1
      );
      const rejectionAudit = await AuditLog.findOne({
        action: "payment.rejected",
        subjectId: payment._id,
      });
      assert.equal(rejectionAudit.actor.toString(), owner._id.toString());
      assert.equal(
        rejectionAudit.metadata.rejectionReason,
        "Transfer amount does not match."
      );

      const memberPayments = await request(
        "GET",
        "/api/payments",
        memberToken
      );
      assert.equal(memberPayments.status, 200);
      assert.equal(memberPayments.body[0].status, "rejected");
      assert.equal(
        memberPayments.body[0].rejectionReason,
        "Transfer amount does not match."
      );

      const retryApproval = await request(
        "PATCH",
        `/api/payments/${payment._id}/verify`,
        ownerToken,
        { decision: "approved" }
      );
      assert.equal(retryApproval.status, 400);
      assert.equal((await Payment.findById(payment._id)).status, "rejected");
    });

    it("approves a manual payment and activates its membership with one audit event", async () => {
      const owner = await createUser("owner", "approve-payment");
      const memberAccount = await createUser("member", "approve-payment");
      const member = await createMember({
        user: memberAccount,
        suffix: "approve-payment",
      });
      const plan = await createPlan();
      const payment = await Payment.create({
        member: member._id,
        plan: plan._id,
        amount: plan.price,
        paymentMethod: "bank",
        status: "pending",
      });
      const ownerToken = tokenFor(owner);

      const approved = await request(
        "PATCH",
        `/api/payments/${payment._id}/verify`,
        ownerToken,
        { decision: "approved" }
      );
      const savedPayment = await Payment.findById(payment._id);

      assert.equal(approved.status, 200);
      assert.equal(savedPayment.status, "paid");
      assert.ok(savedPayment.membershipActivatedAt);
      await processNotificationOutbox();
      await processNotificationOutbox();
      assert.equal(
        await Notification.countDocuments({ recipient: memberAccount._id }),
        1
      );
      assert.equal(
        await NotificationOutbox.countDocuments({
          eventKey: `payment-approved:${payment._id}`,
          deliveredAt: { $ne: null },
        }),
        1
      );
      assert.equal(
        await Membership.countDocuments({
          _id: savedPayment.membership,
          member: member._id,
          status: "active",
        }),
        1
      );
      assert.equal(
        await AuditLog.countDocuments({
          subjectId: payment._id,
          action: "payment.approved",
        }),
        1
      );

      const duplicateApproval = await request(
        "PATCH",
        `/api/payments/${payment._id}/verify`,
        ownerToken,
        { decision: "approved" }
      );
      assert.equal(duplicateApproval.status, 400);
      assert.equal(
        await AuditLog.countDocuments({
          subjectId: payment._id,
          action: "payment.approved",
        }),
        1
      );
    });

    it("limits audit and report endpoints to owners and reconciles totals", async () => {
      const owner = await createUser("owner", "reports");
      const receptionist = await createUser("receptionist", "reports");
      const memberAccount = await createUser("member", "reports");
      const member = await createMember({ user: memberAccount, suffix: "reports" });
      const plan = await createPlan();
      const now = new Date();

      await Payment.create([
        { member: member._id, plan: plan._id, amount: 100, paymentMethod: "cash", status: "paid", paymentDate: now },
        { member: member._id, plan: plan._id, amount: 100, paymentMethod: "bank", status: "pending", paymentDate: now },
        { member: member._id, plan: plan._id, amount: 100, paymentMethod: "bank", status: "rejected", paymentDate: now },
      ]);
      await Attendance.create({
        member: member._id,
        checkInTime: now,
        isOverride: true,
        overrideReason: "Test report override reason.",
        overrideBy: owner._id,
      });
      await AuditLog.create({
        actor: owner._id,
        actorRole: "owner",
        action: "payment.created",
        subjectType: "Payment",
        subjectId: new mongoose.Types.ObjectId(),
        member: member._id,
        summary: "Test audit record.",
      });

      const ownerToken = tokenFor(owner);
      const receptionistToken = tokenFor(receptionist);
      const date = now.toISOString().slice(0, 10);
      const reportPath = `/api/owner/reports?from=${date}&to=${date}`;
      const report = await request("GET", reportPath, ownerToken);
      const audit = await request("GET", "/api/owner/audit-logs", ownerToken);
      const deniedReport = await request("GET", reportPath, receptionistToken);
      const deniedAudit = await request("GET", "/api/owner/audit-logs", receptionistToken);

      assert.equal(report.status, 200);
      assert.equal(report.body.summary.totalRevenue, 100);
      assert.equal(report.body.summary.paidPayments, 1);
      assert.equal(report.body.summary.pendingPayments, 1);
      assert.equal(report.body.summary.rejectedPayments, 1);
      assert.equal(report.body.attendanceByDay[0].checkIns, 1);
      assert.equal(report.body.attendanceByDay[0].overrides, 1);
      assert.equal(audit.status, 200);
      assert.equal(audit.body.total, 1);
      assert.equal(deniedReport.status, 403);
      assert.equal(deniedAudit.status, 403);
    });

    it("does not extend membership again for a duplicate Chapa callback", async () => {
      const memberAccount = await createUser("member", "chapa");
      await createMember({ user: memberAccount, suffix: "chapa" });
      const plan = await createPlan();
      const token = tokenFor(memberAccount);
      const originalFetch = global.fetch;

      global.fetch = async (url, options) => {
        if (String(url).startsWith("https://api.chapa.co/")) {
          if (String(url).includes("/transaction/initialize")) {
            return {
              ok: true,
              json: async () => ({
                status: "success",
                data: { checkout_url: "https://checkout.example.test" },
              }),
            };
          }

          return {
            ok: true,
            json: async () => ({
              status: "success",
              data: { status: "success", amount: "100" },
            }),
          };
        }

        return originalFetch(url, options);
      };

      try {
        const initialized = await request(
          "POST",
          "/api/payments/chapa/initialize",
          token,
          { planId: plan._id }
        );
        assert.equal(initialized.status, 201);

        const payment = await Payment.findById(initialized.body.paymentId);
        const callbackPath = `/api/payments/chapa/callback?trx_ref=${payment.transactionReference}`;
        const firstCallback = await request("GET", callbackPath, token);
        const activatedPayment = await Payment.findById(payment._id);
        const firstMembership = await Membership.findById(activatedPayment.membership);
        const firstEndDate = firstMembership.endDate.toISOString();
        const secondCallback = await request("GET", callbackPath, token);
        const secondMembership = await Membership.findById(activatedPayment.membership);

        assert.equal(firstCallback.status, 200);
        assert.equal(secondCallback.status, 200);
        assert.ok(activatedPayment.membershipActivatedAt);
        assert.equal(secondMembership.endDate.toISOString(), firstEndDate);
        await processNotificationOutbox();
        await processNotificationOutbox();
        assert.equal(
          await Notification.countDocuments({ recipient: memberAccount._id }),
          1
        );
        assert.equal(
          await NotificationOutbox.countDocuments({
            eventKey: `payment-chapa-confirmed:${payment._id}`,
            deliveredAt: { $ne: null },
          }),
          1
        );
        assert.equal(
          await AuditLog.countDocuments({
            subjectId: payment._id,
            action: "payment.chapa_confirmed",
          }),
          1
        );
      } finally {
        global.fetch = originalFetch;
      }
    });
  }
);