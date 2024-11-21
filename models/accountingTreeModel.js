const mongoose = require("mongoose");

const AccountingTreeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  code: { type: String, required: true, unique: true },

  accountType: { type: String, required: true, unique: true },
  parentCode: {
    type: String,
    default: null,
  },
  balance: { type: Number, default: 0 },
});

module.exports = AccountingTreeSchema;
