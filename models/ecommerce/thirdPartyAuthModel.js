const mongoose = require("mongoose");

const thirdPartyAuthSchema = new mongoose.Schema(
  {
    googleClientID: String,
    googleClientSecret: String,
    facebookAppID: String,
    redirectUri: String,
  },
  { timestamps: true }
);

module.exports = thirdPartyAuthSchema;
