const express = require("express");

const authService = require("../../services/authService");
const {
  createCashOrder,
  findAllOrderforCustomer,
} = require("../../services/ecommerce/ecommerceOrderService");

const ecommerceOrderRouter = express.Router();

ecommerceOrderRouter.use(authService.ecommerceProtect);

ecommerceOrderRouter.route("/").get(findAllOrderforCustomer);

ecommerceOrderRouter.route("/:cartId").post(createCashOrder);

module.exports = ecommerceOrderRouter;
