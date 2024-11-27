const mongoose = require("mongoose");

const AccountTransactionSchema = new mongoose.Schema(
  {
    fromAccount: { id: String, name: String, amount: Number, _id: false },

    toAccount: [
      {
        id: String,
        name: String,

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
    desc: String,
  },
  { timestamps: true }
);
module.exports = AccountTransactionSchema;
