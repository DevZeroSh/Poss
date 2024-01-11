const express = require("express");
const {
  createCashOrder,
  findAllOrder,
  filterOrderForLoggedUser,
  findOneOrder,
  createCashOrderMultipelFunds,
  createOrder,
} = require("../services/orderServices");

const authService = require("../services/authService");

const OrderRout = express.Router();

OrderRout.use(authService.protect);

OrderRout.route("/").get(findAllOrder).post(createCashOrder);
OrderRout.route("/funds").post(createCashOrderMultipelFunds);
OrderRout.route("/order").post(createOrder);

OrderRout.route("/:id").get(findOneOrder);

module.exports = OrderRout;
