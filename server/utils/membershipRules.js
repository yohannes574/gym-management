const isMembershipCurrent = (membership, now = new Date()) =>
  Boolean(
    membership &&
      membership.status === "active" &&
      new Date(membership.endDate) >= now
  );

const getMembershipExtensionDates = (
  membership,
  durationDays,
  now = new Date()
) => {
  const isCurrent = isMembershipCurrent(membership, now);
  const startDate = isCurrent
    ? new Date(membership.endDate)
    : new Date(now);
  const endDate = new Date(startDate);

  endDate.setDate(endDate.getDate() + durationDays);

  return {
    startDate: isCurrent ? membership.startDate : startDate,
    endDate,
  };
};

module.exports = {
  getMembershipExtensionDates,
  isMembershipCurrent,
};