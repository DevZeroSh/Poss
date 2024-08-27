const mongoose = require("mongoose");

const devicesSchema = new mongoose.Schema(
  {
    admin: String,
    customerId: String,
    customerName: String,
    customerPhone: String,
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
    piecesAndCost: [{ cost: Number, name: String, _id: false }],
    paymentStatus: String,
    backpack: { type: Boolean, default: false },
    charger: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = devicesSchema;
