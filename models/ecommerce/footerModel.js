const mongoose = require("mongoose");

const footerSchema = new mongoose.Schema(
  {
    pageTitel: String,
    link: String,
    status: {
      type: String,
      enum: ["true", "false"],
      default:"true"
    },
  },
  { timestamps: true }
);

module.exports = footerSchema;
