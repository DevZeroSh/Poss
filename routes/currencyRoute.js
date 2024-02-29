const express = require("express");
const { getCurrencies, createCurrency, getCurrency, deleteCurrency, updataCurrency } = require("../services/currencyService");

const authService = require("../services/authService");

const currencyRoute = express.Router();

currencyRoute.use(authService.protect);

currencyRoute.route("/").get(getCurrencies).post(authService.allowedTo("currency"), createCurrency);
currencyRoute
    .route("/:id")
    .get(getCurrency)
    .put(authService.allowedTo("currency"), updataCurrency)
    .delete(authService.allowedTo("delete currency"), deleteCurrency);

module.exports = currencyRoute;
