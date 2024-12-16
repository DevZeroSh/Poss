const express = require("express");
const {
  findAllOrder,
  findOneOrder,
  returnOrder,
  getReturnOrder,
  getOneReturnOrder,
  DashBordSalse,
  editOrderInvoice,
  canceledOrder,
  findCustomer,
} = require("../services/orderServices");

const authService = require("../services/authService");

const OrderRout = express.Router();

OrderRout.use(authService.protect);


OrderRout.route("/return").post(returnOrder);
OrderRout.route("/getReturnOrder").get(getReturnOrder);
OrderRout.route("/getReturnOrder/:id").get(getOneReturnOrder);
OrderRout.route("/customerorder/:id").get(findCustomer);


OrderRout.route("/").get(findAllOrder);

OrderRout.route("/salesDashbord").post(DashBordSalse);

OrderRout.route("/:id")
  .get(findOneOrder)
  .put(editOrderInvoice)
  .delete(canceledOrder);

module.exports = OrderRout;
