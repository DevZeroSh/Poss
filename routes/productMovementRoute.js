const express = require("express");

const authService = require("../services/authService");
const {
    getAllProductsMovements,
    getProductMovementByID,
} = require("../services/productMovementServices");

const productMovementsRoute = express.Router();

productMovementsRoute.use(authService.protect);
productMovementsRoute.route("/").get(authService.allowedTo("Product Movments"),getAllProductsMovements);
productMovementsRoute.route("/:id").get(authService.allowedTo("Product Movments"),getProductMovementByID);

module.exports = productMovementsRoute;
