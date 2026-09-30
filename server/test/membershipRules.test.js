const assert = require("node:assert/strict");
const test = require("node:test");

const {
  getMembershipExtensionDates,
  isMembershipCurrent,
} = require("../utils/membershipRules");

test("only active memberships that have not expired are current", () => {
  const now = new Date("2026-09-30T12:00:00.000Z");

  assert.equal(isMembershipCurrent(null, now), false);
  assert.equal(
    isMembershipCurrent(
      { status: "expired", endDate: "2026-10-30T12:00:00.000Z" },
      now
    ),
    false
  );
  assert.equal(
    isMembershipCurrent(
      { status: "active", endDate: "2026-09-29T12:00:00.000Z" },
      now
    ),
    false
  );
  assert.equal(
    isMembershipCurrent(
      { status: "active", endDate: "2026-10-30T12:00:00.000Z" },
      now
    ),
    true
  );
});

test("extending a current membership preserves its original start date", () => {
  const now = new Date("2026-09-30T12:00:00.000Z");
  const originalStart = new Date("2026-08-01T12:00:00.000Z");
  const currentEnd = new Date("2026-10-30T12:00:00.000Z");
  const dates = getMembershipExtensionDates(
    { status: "active", startDate: originalStart, endDate: currentEnd },
    30,
    now
  );

  assert.equal(dates.startDate, originalStart);
  assert.equal(
    dates.endDate.toISOString(),
    "2026-11-29T12:00:00.000Z"
  );
});

test("renewing an expired membership starts a new period now", () => {
  const now = new Date("2026-09-30T12:00:00.000Z");
  const dates = getMembershipExtensionDates(
    { status: "expired", endDate: "2026-09-01T12:00:00.000Z" },
    30,
    now
  );

  assert.equal(dates.startDate.toISOString(), now.toISOString());
  assert.equal(
    dates.endDate.toISOString(),
    "2026-10-30T12:00:00.000Z"
  );
});