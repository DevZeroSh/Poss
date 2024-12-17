const mongoose = require("mongoose");

const treeConnectionSchema = new mongoose.Schema(
  {
    name: String,
    accountData: {
      accountId: String,
      accountName: String,
      accountCode: String,
      _id: false,
    },
  },
  { timestamps: true }
);

module.exports = treeConnectionSchema;
