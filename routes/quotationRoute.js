const express = require("express");
const {
  createCashQuotation,
  getAllQuotations,
  getQuotationById,
} = require("../services/quotationServices");

const quotationRouter = express.Router();

// Create a new quotation / Get all quotations
quotationRouter.route("/").post(createCashQuotation).get(getAllQuotations);

// Get / update / delete a specific quotation by ID
quotationRouter.route("/:id").get(getQuotationById); //.put(updateQuotation).delete(deleteQuotation);

module.exports = quotationRouter;
