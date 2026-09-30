const Membership = require("../models/Membership");
const NotificationOutbox = require("../models/NotificationOutbox");

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const LIFECYCLE_INTERVAL_MS = 6 * 60 * 60 * 1000;
const REMINDER_WINDOW_DAYS = 7;

const processMembershipLifecycle = async (now = new Date()) => {
  const expiredResult = await Membership.updateMany(
    {
      status: "active",
      endDate: { $lt: now },
    },
    { $set: { status: "expired" } }
  );

  const reminderCutoff = new Date(now.getTime());
  reminderCutoff.setDate(
    reminderCutoff.getDate() + REMINDER_WINDOW_DAYS
  );

  const memberships = await Membership.find({
    status: "active",
    endDate: { $gte: now, $lte: reminderCutoff },
  })
    .populate("member", "name user")
    .populate("plan", "name")
    .select("member plan endDate");

  let remindersCreated = 0;

  for (const membership of memberships) {
    const member = membership.member;

    if (!member?.user) continue;

    const endDate = new Date(membership.endDate);
    const daysRemaining = Math.max(
      1,
      Math.ceil((endDate.getTime() - now.getTime()) / DAY_IN_MS)
    );
    const dedupeKey = `membership-expiring:${membership._id}:${endDate.getTime()}`;

    try {
      const result = await NotificationOutbox.updateOne(
        { eventKey: dedupeKey },
        {
          $setOnInsert: {
            recipient: member.user,
            type: "membership",
            title: "Membership expiring soon",
            message: `Your ${membership.plan?.name || "gym membership"} expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}. Renew to keep your membership active.`,
            eventKey: dedupeKey,
          },
        },
        { upsert: true }
      );

      remindersCreated += result.upsertedCount || 0;
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  }

  return {
    expiredCount: expiredResult.modifiedCount || 0,
    remindersCreated,
  };
};

const startMembershipLifecycle = () => {
  const run = () => {
    processMembershipLifecycle().catch((error) => {
      console.error("Membership lifecycle job failed:", error.message);
    });
  };

  run();

  const interval = setInterval(run, LIFECYCLE_INTERVAL_MS);
  interval.unref();

  return interval;
};

module.exports = {
  processMembershipLifecycle,
  startMembershipLifecycle,
};