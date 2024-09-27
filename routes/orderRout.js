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
} = require("../services/orderServices");

const authService = require("../services/authService");

const OrderRout = express.Router();

OrderRout.use(authService.protect);

// Define more specific routes before general ones
OrderRout.route("/return").post(returnOrder);
OrderRout.route("/getReturnOrder").get(getReturnOrder);
OrderRout.route("/getReturnOrder/:id").get(getOneReturnOrder);

// OrderRout.route("/salespos").get(findAllSalesPos);
OrderRout.route("/").get(findAllOrder); //.post(createCashOrder);
// OrderRout.route("/funds").post(createCashOrderMultipelFunds);
OrderRout.route("/salesDashbord").post(DashBordSalse);

OrderRout.route("/:id")
  .get(findOneOrder)
  .put(editOrderInvoice)
  .delete(canceledOrder);

module.exports = OrderRout;
