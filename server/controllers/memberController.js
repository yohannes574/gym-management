const Member = require("../models/Member");
const Membership = require("../models/Membership");

// GET all members
const getMembers = async (req, res) => {
try {
const members = await Member.find().sort({
createdAt: -1,
});


res.json(members);


} catch (error) {
console.error("Get members error:", error);


res.status(500).json({
  message: "Server error while getting members.",
});


}
};

// CREATE member
const createMember = async (req, res) => {
try {
const { name, email, phone, gender } = req.body;


if (!name || !email || !phone) {
  return res.status(400).json({
    message: "Name, email, and phone are required.",
  });
}

const existingMember = await Member.findOne({ email });

if (existingMember) {
  return res.status(400).json({
    message: "A member with this email already exists.",
  });
}

const member = await Member.create({
  name,
  email,
  phone,
  gender,
});

res.status(201).json(member);


} catch (error) {
console.error("Create member error:", error);


if (error.code === 11000) {
  return res.status(400).json({
    message: "A member with this email already exists.",
  });
}

if (error.name === "ValidationError") {
  const messages = Object.values(error.errors).map(
    (err) => err.message
  );

  return res.status(400).json({
    message: messages.join(", "),
  });
}

res.status(500).json({
  message: "Server error while creating member.",
});


}
};

// DELETE member
const deleteMember = async (req, res) => {
try {
const member = await Member.findByIdAndDelete(
req.params.id
);


if (!member) {
  return res.status(404).json({
    message: "Member not found.",
  });
}

res.json({
  message: "Member deleted successfully.",
});


} catch (error) {
console.error("Delete member error:", error);


res.status(500).json({
  message: "Server error while deleting member.",
});


}
};

const updateMember = async (req, res) => {
try {
const { name, email, phone, status } = req.body;


const member = await Member.findByIdAndUpdate(
  req.params.id,
  {
    name,
    email,
    phone,
    status,
  },
  {
    returnDocument: "after",
    runValidators: true,
  }
);

if (!member) {
  return res.status(404).json({
    message: "Member not found.",
  });
}

res.json(member);


} catch (error) {
console.error("Update member error:", error);


if (error.code === 11000) {
  return res.status(400).json({
    message: "A member with this email already exists.",
  });
}

if (error.name === "ValidationError") {
  const messages = Object.values(error.errors).map(
    (err) => err.message
  );

  return res.status(400).json({
    message: messages.join(", "),
  });
}

res.status(500).json({
  message: "Server error while updating member.",
});


}
};

const renewMembership = async (req, res) => {
try {
const membership = await Membership.findById(req.params.id)
.populate("plan");


if (!membership) {
  return res.status(404).json({
    message: "Membership not found.",
  });
}

// Start the renewed membership today
const newStartDate = new Date();

// Calculate new end date using plan duration
const newEndDate = new Date(newStartDate);

newEndDate.setDate(
  newEndDate.getDate() + membership.plan.duration
);

// Update membership
membership.startDate = newStartDate;
membership.endDate = newEndDate;
membership.status = "active";

await membership.save();

res.json({
  message: "Membership renewed successfully!",
  membership,
});


} catch (error) {
console.error("Renew membership error:", error);


res.status(500).json({
  message: "Server error while renewing membership.",
});


}
};

module.exports = {
getMembers,
createMember,
deleteMember,
updateMember,
renewMembership,
};
