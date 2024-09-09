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
  canceledPosSales,
} = require("../services/salesPosFishServices");

const SalesPosRout = express.Router();

// SalesPosRout.use(authService.protect);

// Define more specific routes before general ones

// SalesPosRout.route("/salespos").get(findAllSalesPos);
SalesPosRout.route("/").get(findAllSalsePos).post(createCashOrder);
SalesPosRout.route("/funds").post(createCashOrderMultipelFunds);

SalesPosRout.route("/returnpossales")
  .post(returnPosSales)
  .get(getReturnPosSales);
SalesPosRout.route("/returnpossales/:id").get(getOneReturnPosSales);
SalesPosRout.route("/canceledsalespos/:id").put(canceledPosSales);
SalesPosRout.route("/:id").get(findOneSalsePos).put(editPosOrder);

module.exports = SalesPosRout;
