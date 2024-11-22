const mongoose = require("mongoose");

const AccountingTreeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  code: { type: String },

  accountType: { type: String },
  detailType: String,
  description: String,
  date: String,

  parentCode: {
    type: String,
    default: null,
  },
  balance: { type: Number, default: 0 },
});

module.exports = AccountingTreeSchema;
