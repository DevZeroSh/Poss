const express = require("express");
const authService = require("../services/authService");
const { getSoldReports } = require("../services/soldReportServices");

const SoldReportsRoute = express.Router();

SoldReportsRoute.use(authService.protect);
SoldReportsRoute.route("/").get(getSoldReports);

module.exports = SoldReportsRoute;
