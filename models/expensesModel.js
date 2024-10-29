const mongoose = require("mongoose");

const expensesSchema = new mongoose.Schema(
  {
    expenseName: String,
    expenseCategoryName: [{ name: String, id: String, _id: false }],
    accountingTreeName: String,
    accountingTreeCode: String,
    accountingTreeId: String,
  },
  { timestamps: true }
);

module.exports = expensesSchema;
