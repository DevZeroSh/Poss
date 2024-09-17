const express = require("express");

const authService = require("../../services/authService");
const {
  getManitenaceCase,
  createManitenaceCase,
  getOneManitenaceCase,
  updateManitenaceCase,
  deleteManitenaceCase,
} = require("../../services/maintenance/manitencesCaseService");

const manitCaseRout = express.Router();
manitCaseRout.use(authService.protect);

manitCaseRout.route("/").get(getManitenaceCase).post(createManitenaceCase);

manitCaseRout
  .route("/:id")
  .get(getOneManitenaceCase)
  .put(updateManitenaceCase)
  .delete(deleteManitenaceCase);

module.exports = manitCaseRout;
