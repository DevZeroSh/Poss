const mongoose = require("mongoose");

const manitencesCase = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.ObjectId, ref: "manitUser" },
    deviceId: { type: mongoose.Schema.ObjectId, ref: "Device" },
    admin: String,
    userNotes: String,
    deviceProblem: String,
    deviceStatus: String,
    userDesc: String,
    expectedAmount: String,
    amountDue: Number,
    explanition: String,
    paymentStatus: String,
    backpack: { type: Boolean, default: false },
    charger: { type: Boolean, default: false },
    deliveryDate: String,
    customerCalling: [{ connect: String, date: Date, user: String, _id: false }],
    piecesAndCost: [
      {
        productId: String,
        qr: String,
        name: String,
        quantity: Number,
        taxPrice: Number,
        exchangeRate: String,
        buyingPrice: Number,
        taxRate: Number,
        taxs: String,
        price: Number,
        prodcutType: String,
        _id: false,
      },
    ],
    counter: String,
  },
  { timestamps: true }
);

module.exports = manitencesCase;
