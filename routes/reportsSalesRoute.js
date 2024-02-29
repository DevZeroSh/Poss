const express = require("express");

const reportsSalesRoute = express.Router();

const authService = require("../services/authService");
const {
  getSales /*, getSpecificReports*/,
} = require("../services/reportsSalesService");

reportsSalesRoute.use(authService.protect);

reportsSalesRoute
  .route("/")
  .get(authService.allowedTo("Sales Reports"), getSales);
//reportsSalesRoute.route("/:id").get(getSpecificReports);

module.exports = reportsSalesRoute;
