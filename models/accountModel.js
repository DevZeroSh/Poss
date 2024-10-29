const mongoose = require("mongoose");

const AccountTransactionSchema = new mongoose.Schema(
  {
    fromAccount: String,

    toAccount: [
      {
        accountName: String,

        amount: {
          type: Number,
          default: 0,
        },

        _id: false,
      },
    ],
    totalAmount: Number,
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);
module.exports = AccountTransactionSchema;
