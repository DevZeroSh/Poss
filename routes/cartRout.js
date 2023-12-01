const express = require("express");
const {
  addProductToCart,
  getLoggedUserCart,
  removeSpecifcCartItem,
  clearCart,
  updateCartItemQuantity,
  applyeCoupon,
  clearCoupon,
} = require("../services/cartServices");
const authService = require("../services/authService");
const { createCashOrder } = require("../services/orderServices");

const cartRout = express.Router();
cartRout.use(authService.protect);

cartRout
  .route("/")
  .post(addProductToCart)
  
  .get(getLoggedUserCart)
  .delete(clearCart);

cartRout.put("/applycoupon", applyeCoupon);
cartRout.put("/disapplycoupon", clearCoupon);
cartRout
  .route("/:itemId")
  .put(updateCartItemQuantity)
  .delete(removeSpecifcCartItem);
module.exports = cartRout;
