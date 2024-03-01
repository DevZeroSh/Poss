const express = require("express");
const {
  getCurrencies,
  createCurrency,
  getCurrency,
  deleteCurrency,
  updataCurrency,
} = require("../services/currencyService");

const authService = require("../services/authService");

const currencyRoute = express.Router();

currencyRoute.use(authService.protect);

currencyRoute.route("/").get(getCurrencies).post(createCurrency);
currencyRoute
  .route("/:id")
  .get(getCurrency)
  .put(updataCurrency)
  .delete(deleteCurrency);

module.exports = currencyRoute;
