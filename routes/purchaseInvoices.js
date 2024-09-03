const express = require("express");
const authService = require("../services/authService");
const {
  findAllProductInvoices,
  findOneProductInvoices,
  createProductInvoices,
  updateInvoices,
  returnPurchaseInvoice,
  getReturnPurchase,
  getOneReturnPurchase,
  createPurchaseInvoice,
} = require("../services/purchaseInvoicesServices");
const PurchaseInvoices = express.Router();
PurchaseInvoices.use(authService.protect);

PurchaseInvoices.route("/refund")
  .get(getReturnPurchase)
  .post(returnPurchaseInvoice);
PurchaseInvoices.route("/refund/:id").get(getOneReturnPurchase);
PurchaseInvoices.route("/")
  .post(createPurchaseInvoice)
  .get(findAllProductInvoices);
PurchaseInvoices.route("/:id").get(findOneProductInvoices).put(updateInvoices);

module.exports = PurchaseInvoices;
