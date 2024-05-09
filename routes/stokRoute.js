const express = require("express");

const authService = require("../services/authService");
const {
  getStoks,
  createStok,
  getOneStok,
  updateStok,
  deleteStok,
} = require("../services/stokService");

const stokRout = express.Router();

stokRout.route("/").get(getStoks).post(authService.protect, createStok);
stokRout
  .route("/:id")
  .get(getOneStok)
  .put(authService.protect, updateStok)
  .delete(authService.protect, deleteStok);

module.exports = stokRout;
