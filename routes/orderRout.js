const express = require("express");
const {
  createCashOrder,
  findAllOrder,
  filterOrderForLoggedUser,
  findOneOrder,
  createCashOrder2,
} = require("../services/orderServices");

const authService = require("../services/authService");

const OrderRout = express.Router();

OrderRout.use(authService.protect);

OrderRout.route("/:cartId").post(createCashOrder);
OrderRout.route("/funds/:cartId").post(createCashOrder2);
OrderRout.route("/").get(filterOrderForLoggedUser, findAllOrder);
OrderRout.route("/:id").get(findOneOrder);

module.exports = OrderRout;
