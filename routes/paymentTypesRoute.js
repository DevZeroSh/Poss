const express = require("express");
const {
    getPaymentTypes,
    createPaymentType,
    getOnePaymentType,
    updataPaymentType,
    deleteOnePaymentType,
} = require("../services/paymentTypesService");

const paymentTypes = express.Router();

paymentTypes.route("/").get(getPaymentTypes).post(createPaymentType);
paymentTypes.route("/:id").get(getOnePaymentType).put(updataPaymentType).delete(deleteOnePaymentType);

module.exports = paymentTypes;
