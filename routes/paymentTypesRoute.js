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
    .get(authService.allowedTo("payment"),getPaymentTypes)
    .post(authService.allowedTo("new payment"),createPaymentType);
paymentTypes.route("/:id")
    .get(authService.allowedTo("payment"),getOnePaymentType)
    .put(authService.allowedTo("edit payment"),updataPaymentType)
    .delete(authService.allowedTo("delete payment"),deleteOnePaymentType);

module.exports = paymentTypes;
