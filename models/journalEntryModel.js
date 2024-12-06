const mongoose = require("mongoose");

const journalEntrySchema = new mongoose.Schema(
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
      type: String,
      default: Date.now,
    },
    desc: String,
    counter: String,
  },
  { timestamps: true }
);
module.exports = journalEntrySchema;
