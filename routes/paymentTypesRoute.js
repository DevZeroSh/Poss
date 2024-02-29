const express = require("express");
const {
    getPaymentTypes,
    createPaymentType,
    getOnePaymentType,
    updataPaymentType,
    deleteOnePaymentType,
} = require("../services/paymentTypesService");
const authService = require("../services/authService");

const paymentTypes = express.Router();

paymentTypes.use(authService.protect);

paymentTypes.route("/")
    .get(getPaymentTypes)
    .post(authService.allowedTo("payment"),createPaymentType);
paymentTypes.route("/:id")
    .get(getOnePaymentType)
    .put(authService.allowedTo("payment"),updataPaymentType)
    .delete(authService.allowedTo("delete payment"),deleteOnePaymentType);

module.exports = paymentTypes;
