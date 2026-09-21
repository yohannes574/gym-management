/**
 * One-time seed script to create the first staff accounts.
 *
 * Usage (from the server folder):
 *   npm run seed
 *
 * Owner details come from .env (SEED_OWNER_NAME, SEED_OWNER_EMAIL,
 * SEED_OWNER_PASSWORD) or from command line arguments:
 *   node scripts/seedStaff.js --owner-name "John" --owner-email john@gym.com --owner-password secret123
 *
 * You can also seed an optional receptionist:
 *   node scripts/seedStaff.js --receptionist-name "Sara" --receptionist-email sara@gym.com --receptionist-password secret123
 */

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../models/User");

dotenv.config();

// Read --key=value arguments
const parseArgs = () => {
  const args = {};

  process.argv.slice(2).forEach((arg) => {
    const [key, ...rest] = arg.split("=");

    if (rest.length > 0) {
      args[key.replace(/^--/, "")] = rest.join("=");
    }
  });

  return args;
};

const seedStaff = async () => {
  const args = parseArgs();

  const owner = {
    name: args["owner-name"] || process.env.SEED_OWNER_NAME,
    email: (
      args["owner-email"] ||
      process.env.SEED_OWNER_EMAIL ||
      ""
    ).toLowerCase(),
    password:
      args["owner-password"] || process.env.SEED_OWNER_PASSWORD,
  };

  if (!owner.name || !owner.email || !owner.password) {
    console.error(
      "Missing owner details.\n" +
        "Add SEED_OWNER_NAME, SEED_OWNER_EMAIL, and SEED_OWNER_PASSWORD to .env\n" +
        "or run: node scripts/seedStaff.js --owner-name ... --owner-email ... --owner-password ..."
    );

    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

    // Owner
    const existingOwner = await User.findOne({
      email: owner.email,
    });

    if (existingOwner) {
      console.log(
        `Owner with email ${owner.email} already exists. Skipping.`
      );
    } else {
      const hashedPassword = await bcrypt.hash(
        owner.password,
        10
      );

      await User.create({
        name: owner.name,
        email: owner.email,
        password: hashedPassword,
        role: "owner",
        approvalStatus: "approved",
      });

      console.log(`Owner account created: ${owner.email}`);
    }

    // Optional receptionist
    const receptionist = {
      name:
        args["receptionist-name"] ||
        process.env.SEED_RECEPTIONIST_NAME,
      email: (
        args["receptionist-email"] ||
        process.env.SEED_RECEPTIONIST_EMAIL ||
        ""
      ).toLowerCase(),
      password:
        args["receptionist-password"] ||
        process.env.SEED_RECEPTIONIST_PASSWORD,
    };

    if (
      receptionist.name &&
      receptionist.email &&
      receptionist.password
    ) {
      const existingReceptionist = await User.findOne({
        email: receptionist.email,
      });

      if (existingReceptionist) {
        console.log(
          `Receptionist with email ${receptionist.email} already exists. Skipping.`
        );
      } else {
        const hashedPassword = await bcrypt.hash(
          receptionist.password,
          10
        );

        await User.create({
          name: receptionist.name,
          email: receptionist.email,
          password: hashedPassword,
          role: "receptionist",
          approvalStatus: "approved",
        });

        console.log(
          `Receptionist account created: ${receptionist.email}`
        );
      }
    }

    await mongoose.disconnect();

    console.log("Seed complete.");

    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error.message);

    process.exit(1);
  }
};

seedStaff();