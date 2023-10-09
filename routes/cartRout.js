const express = require("express");
const {
  addProductToCart,
  getLoggedUserCart,
  removeSpecifcCartItem,
  clearCart,
  updateCartItemQuantity,
} = require("../services/cartServices");

const cartRout = express.Router();

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
