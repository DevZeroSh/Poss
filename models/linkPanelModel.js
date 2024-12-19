const mongoose = require("mongoose");

const LinkPanelSchema = new mongoose.Schema(
  {
    name: String,
    accountData: {
      accountId: String,
      accountName: String,
      accountCode: String,
      _id: false,
    },
    link: String,
  },
  { timestamps: true }
);

module.exports = LinkPanelSchema;
