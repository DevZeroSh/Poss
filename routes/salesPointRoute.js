const express = require("express");
const authService = require("../services/authService");
const {
  createSalesPoint,
  getSalesPoint,
  getOneSalePoint,
} = require("../services/salesPointServices");

const SalesPointRout = express.Router();

SalesPointRout.use(authService.protect);

SalesPointRout.route("/").get(getSalesPoint).post(createSalesPoint);
SalesPointRout.route("/:id").get(getOneSalePoint);

module.exports = SalesPointRout;
