const express = require("express");

const authService = require("../../services/authService");
const {
  createCashOrder,
  findAllOrderforCustomer,
  filterOrderForLoggedUser,
  filterOneOrderForLoggedUser,
  UpdateEcommersOrder,
  customarChangeOrderStatus,
  createOrderDashboard,
  convertEcommersOrderToInvoice,
} = require("../../services/ecommerce/ecommerceOrderService");

const ecommerceOrderRouter = express.Router();
ecommerceOrderRouter
  .route("/ecommerceOrder")
  .get(authService.protect, findAllOrderforCustomer)
  .post(authService.protect, createOrderDashboard);

ecommerceOrderRouter
  .route("/")
  .get(
    authService.ecommerceProtect,
    findAllOrderforCustomer
  );
ecommerceOrderRouter
  .route("/:id")
  .get(authService.ecommerceProtect, filterOneOrderForLoggedUser)
  .post(authService.ecommerceProtect, createCashOrder);

ecommerceOrderRouter
  .route("/convert-ecommers-order/:id")
  .put(authService.protect, convertEcommersOrderToInvoice);

ecommerceOrderRouter
  .route("/ecommerceOrder/:id")
  .get(authService.protect, filterOneOrderForLoggedUser)
  .patch(customarChangeOrderStatus)
  .put(authService.protect, UpdateEcommersOrder);

module.exports = ecommerceOrderRouter;
