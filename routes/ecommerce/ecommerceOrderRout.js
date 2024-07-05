const express = require("express");

const authService = require("../../services/authService");
const {
  createCashOrder,
  findAllOrderforCustomer,
  filterOrderForLoggedUser,
  filterOneOrderForLoggedUser,
  UpdateEcommersOrder,
  customarChangeOrderStatus,
} = require("../../services/ecommerce/ecommerceOrderService");

const ecommerceOrderRouter = express.Router();
ecommerceOrderRouter
  .route("/ecommerceOrder")
  .get(authService.protect, findAllOrderforCustomer);

ecommerceOrderRouter
  .route("/")
  .get(
    authService.ecommerceProtect,
    filterOrderForLoggedUser,
    findAllOrderforCustomer
  );
ecommerceOrderRouter
  .route("/:id")
  .get(authService.ecommerceProtect, filterOneOrderForLoggedUser);

ecommerceOrderRouter
  .route("/ecommerceOrder/:id")
  .get(authService.protect, filterOneOrderForLoggedUser)
  .patch(customarChangeOrderStatus)
  .put(authService.protect, UpdateEcommersOrder);

ecommerceOrderRouter
  .route("/:id")
  .post(authService.ecommerceProtect, createCashOrder);

module.exports = ecommerceOrderRouter;
