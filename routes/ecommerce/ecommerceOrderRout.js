const express = require("express");

const authService = require("../../services/authService");
const {
  createCashOrder,
  findAllOrderforCustomer,
  filterOrderForLoggedUser,
  filterOneOrderForLoggedUser,
  UpdateEcommersOrder,
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
  .put(authService.protect, UpdateEcommersOrder);

ecommerceOrderRouter
  .route("/:cartId")
  .post(authService.ecommerceProtect, createCashOrder);

module.exports = ecommerceOrderRouter;
