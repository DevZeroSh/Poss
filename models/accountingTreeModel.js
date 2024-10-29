const mongoose = require("mongoose");

const AccountingTreeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  code: { type: String, required: true, unique: true },

  parentCode: {
    type: String,
    default: null,
  },
  balance: { type: Number, default: 0 },
  debit: { type: Number, default: 0 },
  creditor: { type: Number, default: 0 },
  type: { type: String },
});

module.exports = AccountingTreeSchema;
