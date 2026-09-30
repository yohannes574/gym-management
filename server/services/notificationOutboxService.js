const crypto = require("crypto");
const Notification = require("../models/Notification");
const NotificationOutbox = require("../models/NotificationOutbox");
const { withAuditTransaction } = require("./auditLogService");

const LOCK_DURATION_MS = 60 * 1000;
const MAX_ATTEMPTS_PER_RUN = 100;

const enqueueMemberNotification = async (memberId, event, session) => {
  const Member = require("../models/Member");
  const member = await Member.findById(memberId)
    .select("user")
    .session(session);

  if (!member?.user) return null;

  const [outboxEvent] = await NotificationOutbox.create(
    [{
      eventKey: event.eventKey,
      recipient: member.user,
      type: event.type,
      title: event.title,
      message: event.message,
    }],
    { session }
  );

  return outboxEvent;
};

const claimNextEvent = async () => {
  const now = new Date();
  const lockToken = crypto.randomUUID();

  return NotificationOutbox.findOneAndUpdate(
    {
      deliveredAt: null,
      nextAttemptAt: { $lte: now },
      $or: [
        { lockedUntil: null },
        { lockedUntil: { $lte: now } },
      ],
    },
    {
      $set: {
        lockToken,
        lockedUntil: new Date(now.getTime() + LOCK_DURATION_MS),
      },
      $inc: { attempts: 1 },
    },
    {
      new: true,
      sort: { createdAt: 1 },
    }
  );
};

const deliverEvent = async (event) => {
  await withAuditTransaction(async (session) => {
    const currentEvent = await NotificationOutbox.findOne({
      _id: event._id,
      lockToken: event.lockToken,
      deliveredAt: null,
    }).session(session);

    if (!currentEvent) return;

    await Notification.updateOne(
      { dedupeKey: currentEvent.eventKey },
      {
        $setOnInsert: {
          recipient: currentEvent.recipient,
          type: currentEvent.type,
          title: currentEvent.title,
          message: currentEvent.message,
          dedupeKey: currentEvent.eventKey,
        },
      },
      { upsert: true, session }
    );

    currentEvent.deliveredAt = new Date();
    currentEvent.lockedUntil = null;
    currentEvent.lockToken = null;
    currentEvent.lastError = null;
    await currentEvent.save({ session });
  });
};

const releaseForRetry = async (event, error) => {
  const delayMs = Math.min(
    60 * 60 * 1000,
    1000 * 2 ** Math.min(event.attempts, 10)
  );

  await NotificationOutbox.updateOne(
    { _id: event._id, lockToken: event.lockToken, deliveredAt: null },
    {
      $set: {
        lockedUntil: null,
        lockToken: null,
        nextAttemptAt: new Date(Date.now() + delayMs),
        lastError: String(error.message || error).slice(0, 500),
      },
    }
  );
};

const processNotificationOutbox = async () => {
  let attempted = 0;
  let delivered = 0;

  while (attempted < MAX_ATTEMPTS_PER_RUN) {
    const event = await claimNextEvent();
    if (!event) break;

    attempted += 1;
    try {
      await deliverEvent(event);
      delivered += 1;
    } catch (error) {
      console.error("Notification outbox delivery failed:", error.message);
      await releaseForRetry(event, error);
    }
  }

  return { attempted, delivered };
};

const startNotificationOutbox = () => {
  const run = () => {
    processNotificationOutbox().catch((error) => {
      console.error("Notification outbox worker failed:", error.message);
    });
  };

  run();
  const interval = setInterval(run, 5000);
  interval.unref();
  return interval;
};

module.exports = {
  enqueueMemberNotification,
  processNotificationOutbox,
  startNotificationOutbox,
};