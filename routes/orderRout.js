const express = require("express");
const {
  createCashOrder,
  findAllOrder,
  filterOrderForLoggedUser,
  findOneOrder,
  createCashOrderMultipelFunds,
} = require("../services/orderServices");

const authService = require("../services/authService");

const OrderRout = express.Router();

OrderRout.use(authService.protect);

OrderRout.route("/").post(createCashOrder);
OrderRout.route("/funds").post(createCashOrderMultipelFunds);
OrderRout.route("/").get(findAllOrder);
OrderRout.route("/:id").get(findOneOrder);

module.exports = OrderRout;
