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
OrderRout.route("/return").post(returnOrder);
OrderRout.route("/getReturnOrder").get(getReturnOrder);
OrderRout.route("/getReturnOrder/:id").get(getOneReturnOrder);

OrderRout.route("/").get(findAllOrder).post(createCashOrder);
OrderRout.route("/funds").post(createCashOrderMultipelFunds);

OrderRout.route("/:id").get(findOneOrder).put(editOrder);

module.exports = OrderRout;
