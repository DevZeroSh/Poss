const mongoose = require("mongoose");

const devicesSchema = new mongoose.Schema(
  {
    admin: String,
    customerId: String,
    customerName: String,
    customerPhone: String,
    customerEmail: String,
    connection: [{ connect: String, date: Date, user: String, _id: false }],
    note: String,
    serialNumber: String,
    deviceName: String,
    deviceType: String,
    issue: String,
    status: String,
    desc: String,
    total: Number, // payed Total
    approximateCost: String, // The first cost
    deviceModel: String,
    deviceStatus: String,
    fixingDesc: String,
    piecesAndCost: [
      {
        cost: Number,
        name: String,
        quantity: Number,
        productId: String,
        qr: String,
        exchangeRate: String,
        buyingPrice: Number,
        taxRate: Number,
        taxs: String,
        price: Number,
        paid: { type: String, enum: ["paid", "unpaid"], default: "unpaid" },
        _id: false,
        prodcutType: String,
      },
    ],
    paymentStatus: String,
    backpack: { type: Boolean, default: false },
    charger: { type: Boolean, default: false },
    deliveryDate: String,
    brand: String,
    conuter: String,
  },
  { timestamps: true }
);

module.exports = devicesSchema;
