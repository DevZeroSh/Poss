const express = require("express");

const authService = require("../services/authService");
const {
  findAllSalsePos,
  createCashOrder,
  createCashOrderMultipelFunds,
  findOneSalsePos,
  editPosOrder,
  returnPosSales,
  getReturnPosSales,
  getOneReturnPosSales,
} = require("../services/salesPosFishServices");

const SalesPosRout = express.Router();

SalesPosRout.use(authService.protect);

// Define more specific routes before general ones

// SalesPosRout.route("/salespos").get(findAllSalesPos);
SalesPosRout.route("/").get(findAllSalsePos).post(createCashOrder);
SalesPosRout.route("/funds").post(createCashOrderMultipelFunds);

SalesPosRout.route("/:id").get(findOneSalsePos).put(editPosOrder);
SalesPosRout.route("/returnPosSales").post(returnPosSales);
SalesPosRout.route("/getReturnPosSales").get(getReturnPosSales);
SalesPosRout.route("/getReturnPosSales/:id").get(getOneReturnPosSales);
module.exports = SalesPosRout;
