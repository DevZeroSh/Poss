const express = require("express");
const { getPaymentTypes } = require("../services/paymentTypesService");

const paymentTypes = express.Router();

paymentTypes.route("/").get(getPaymentTypes);

module.exports = paymentTypes;