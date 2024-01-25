const express = require("express");
const {
    createCashOrder,
    findAllOrder,
    findOneOrder,
    createCashOrderMultipelFunds,
    editOrder,
} = require("../services/orderServices");

const authService = require("../services/authService");

const OrderRout = express.Router();

OrderRout.use(authService.protect);

OrderRout.route("/").get(findAllOrder).post(createCashOrder);
OrderRout.route("/funds").post(createCashOrderMultipelFunds);

OrderRout.route("/:id").get(findOneOrder).put(editOrder);

module.exports = OrderRout;
