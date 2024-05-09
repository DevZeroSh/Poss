const express = require("express");

const authService = require("../services/authService");
const {
  getStocks,
  createStock,
  getOneStock,
  updateStock,
  deleteStock,
} = require("../services/stockService");

const stockRout = express.Router();

stockRout.route("/").get(getStocks).post(authService.protect, createStock);
stockRout
  .route("/:id")
  .get(getOneStock)
  .put(authService.protect, updateStock)
  .delete(authService.protect, deleteStock);

module.exports = stockRout;
