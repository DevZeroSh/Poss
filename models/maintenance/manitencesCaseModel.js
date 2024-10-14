const mongoose = require("mongoose");

const manitencesCase = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.ObjectId, ref: "manitUser" },
    deviceId: { type: mongoose.Schema.ObjectId, ref: "Device" },
    admin: String,
    userNotes: String,
    deviceProblem: String,
    deviceStatus: String,
    employeeDesc: String,
    expectedAmount: String,
    amountDue: { type: Number, default: 0 },
    explanition: String,
    manitencesStatus: String,
    paymentStatus: { type: String, enum: ["paid", "unpaid"] },
    backpack: { type: Boolean, default: false },
    charger: { type: Boolean, default: false },
    cable: { type: Boolean, default: false },
    deliveryDate: String,
    deviceReceptionDate: String,
    problemType: String,
    caseStatus: String,
    customerCalling: [
      { connect: String, date: Date, user: String, _id: false },
    ],
    caseCounter: String,
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
        taxsId: String,
        price: Number,
        prodcutType: String,
        stockId: String,
        desc: String,
        _id: false,
      },
    ],
    technicalDesc: String,
    counter: String,
  },
  { timestamps: true }
);

module.exports = manitencesCase;
