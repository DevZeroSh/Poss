const express = require("express");

const { getPricingMethods, createPricingMethod, getSpecificCategoryPricing } = require("../services/pricingMethodService");

const authService = require("../services/authService");

const pricingMethodRoute = express.Router();
pricingMethodRoute.use(authService.protect);

pricingMethodRoute.route("/").get(getPricingMethods).post(createPricingMethod);
pricingMethodRoute.route("/:id").get(getSpecificCategoryPricing);

module.exports = pricingMethodRoute;
