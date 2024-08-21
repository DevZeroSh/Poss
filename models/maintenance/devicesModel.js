const mongoose = require("mongoose");

const devicesSchema = new mongoose.Schema(
  {
    admin: String,
    caserecord: [{ date: Date, name: String, status: String }],
    customerId: String,
    customerName: String,
    customerPhone: String,
    connection: [{ connect: String, date: Date, user: String }],
    note: String,
    srialNumber: String,
    devicesName: String,
    malfunction: String,
    status: String,
    des: String,
    total: Number, // payed Total
    cost: String, // The first cost
    deviceModel: String,
    deviceStatus: String,
    fixingDes: String,
    piecesAndCost: [{ const: Number, name: String }],
    paystatus: String,
    backback: Boolean,
    charger: Boolean,
  },
  { timestamps: true }
);

module.exports = devicesSchema;
