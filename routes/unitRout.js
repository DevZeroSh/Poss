const express = require("express");

const {
  updataUnit,
  getUnits,
  createUnit,
  deleteUnit,
  getUnit,
} = require("../services/UnitServices");
const {
  createUnitValidator,
  getUnitValidator,
  updataUnitValidator,
  deleteUnitValidator,
} = require("../utils/validators/unitValidator");

const authService = require('../services/authService');
const unitRout = express.Router();
unitRout.use(authService.protect);

unitRout.route("/").get(getUnits).post(createUnitValidator, createUnit);
unitRout
  .route("/:id")
  .get(getUnitValidator, getUnit)
  .put(updataUnitValidator, updataUnit)
  .delete(deleteUnitValidator, deleteUnit);

module.exports = unitRout;
