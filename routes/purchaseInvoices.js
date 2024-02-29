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
} = require("../services/purchaseInvoicesServices");
const PurchaseInvoices = express.Router();
PurchaseInvoices.use(authService.protect);

PurchaseInvoices.route("/refund").get(getReturnPurchase).post(authService.allowedTo("Refund Purchase Invoice"),returnPurchaseInvoice);
PurchaseInvoices.route("/refund/:id").get(getOneReturnPurchase)
PurchaseInvoices.route("/")
  .post(authService.allowedTo("Purchase Invoice"),createProductInvoices)
  .get(findAllProductInvoices);
PurchaseInvoices.route("/:id").get(findOneProductInvoices).put(authService.allowedTo("Purchase Invoice"),updateInvoices);

module.exports = PurchaseInvoices;
