const mongoose = require("mongoose");

// Define the schema for the Organization collection
const organizationSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    branches: { type: String, trim: true },
    operatingCities: {
      type: [String], // Array of strings for multiple cities
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.every((city) => typeof city === "string" && city.trim().length > 0);
        },
        message: (props) =>
          `Operating cities must be a non-empty array of valid city names!`,
      },
    },
    website: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          return v
            ? /^(https?:\/\/)?(www\.)?[a-z0-9.-]+\.[a-z]{2,}$/.test(v)
            : true; // Basic website URL validation
        },
        message: (props) => `${props.value} is not a valid website URL!`,
      },
    },
    companyEmail: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          return /\S+@\S+\.\S+/.test(v); // Basic email validation
        },
        message: (props) => `${props.value} is not a valid company email!`,
      },
    },
    password: {
      type: String,
      required: true,
      minlength: [6, "Password must be at least 6 characters long"],
    },
    selectedServices: {
      type: [String], // Array of strings for multiple selected services
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.every((service) => typeof service === "string" && service.trim().length > 0);
        },
        message: (props) =>
          `Selected services must be a non-empty array of valid service names!`,
      },
    },
    isVerified: {
      type: Boolean,
      default: false, // Default to not verified
    },
    verificationCode: {
      type: String, // Stores the OTP or verification code
      required: false, // Only present during verification
    },

    // ✅ New Fields for Profile Management

    aboutUs: {
      type: String,
      trim: true,
      default: "No about us information provided.",
    },

    logo: {
      type: String, // Stores the filename or URL of the uploaded logo
      trim: true,
    },

    socialMedia: [
      {
        platform: { type: String, required: true },
        link: {
          type: String,
          required: true,
          validate: {
            validator: function (v) {
              return v.match(/https?:\/\/(www\.)?\w+\.\w+/);
            },
            message: (props) => `${props.value} is not a valid URL!`,
          },
        },
      },
    ],

    // ✅ Stripe Account ID for payouts
    stripeAccountId: { type: String, trim: true },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt timestamps
);

module.exports = mongoose.model("Organization", organizationSchema);
