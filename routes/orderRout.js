const express = require("express");
const {
  createCashOrder,
  findAllOrder,
  findOneOrder,
  createCashOrderMultipelFunds,
  editOrder,
  returnOrder,
  getReturnOrder,
  getOneReturnOrder,
} = require("../services/orderServices");

const authService = require("../services/authService");

const OrderRout = express.Router();

OrderRout.use(authService.protect);

// Define more specific routes before general ones
OrderRout.route("/return").post(
  authService.allowedTo("refund Order"),
  returnOrder
);
OrderRout.route("/getReturnOrder").get(getReturnOrder);
OrderRout.route("/getReturnOrder/:id").get(getOneReturnOrder);

OrderRout.route("/")
  .get(findAllOrder)
  .post(authService.allowedTo("Order"), createCashOrder);
OrderRout.route("/funds").post(
  authService.allowedTo("Order"),
  createCashOrderMultipelFunds
);

OrderRout.route("/:id")
  .get(findOneOrder)
  .put(authService.allowedTo("Order"), editOrder);

module.exports = OrderRout;
