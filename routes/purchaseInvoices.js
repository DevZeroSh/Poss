const express = require("express");
const authService = require("../services/authService");
const {
  getProductInvoices,
  updateInvoicesQuantity,
  findAllProductInvoices,
} = require("../services/purchaseInvoicesServices");
const productInvoicesRout = express.Router();
productInvoicesRout.use(authService.protect);

productInvoicesRout.route("/").post(getProductInvoices).get(findAllProductInvoices);
productInvoicesRout.route("/:itemId").put(updateInvoicesQuantity);
module.exports = productInvoicesRout;
