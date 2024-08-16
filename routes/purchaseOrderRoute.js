const express = require("express");
const {
  getAllPurchaseOrder,
  createCashPurchaseOrder,
  getPurchaseOrderById,
} = require("../services/purchaseOrderServices");

const purchaseOrderRouter = express.Router();

// Create a new purchaseOrder / Get all purchaseOrders
purchaseOrderRouter
  .route("/")
  .post(getAllPurchaseOrder)
  .get(createCashPurchaseOrder);

// Get / update / delete a specific purchaseOrder by ID
purchaseOrderRouter.route("/:id").get(getPurchaseOrderById);

module.exports = purchaseOrderRouter;
