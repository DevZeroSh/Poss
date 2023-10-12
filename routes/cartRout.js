const express = require("express");
const {
  addProductToCart,
  getLoggedUserCart,
  removeSpecifcCartItem,
  clearCart,
  updateCartItemQuantity,
} = require("../services/cartServices");
const authService = require("../services/authService");

const cartRout = express.Router();
cartRout.use(authService.protect);

cartRout
  .route("/")
  .post(addProductToCart)
  .get(getLoggedUserCart)
  .delete(clearCart);
cartRout
  .route("/:itemId")
  .put(updateCartItemQuantity)
  .delete(removeSpecifcCartItem);
module.exports = cartRout;
