const express = require("express");



const authService = require("../services/authService");
const {
  getPayment,
  createPayment,
  getOnePayment,
} = require("../services/paymentService");

const paymentRout = express.Router();
// paymentRout.use(authService.protect);

paymentRout.route("/").get(getPayment).post(createPayment);
paymentRout.route("/:id").get(getOnePayment);

module.exports = paymentRout;
