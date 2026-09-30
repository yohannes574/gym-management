const mongoose = require("mongoose");
const AuditLog = require("../models/AuditLog");

const recordAuditEvent = async (event, options = {}) => {
  const [auditLog] = await AuditLog.create(
    [event],
    options.session ? { session: options.session } : undefined
  );

  return auditLog;
};

const withAuditTransaction = async (work) => {
  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      result = await work(session);
    });

    return result;
  } finally {
    await session.endSession();
  }
};

module.exports = { recordAuditEvent, withAuditTransaction };