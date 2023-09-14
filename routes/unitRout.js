const express = require("express");

const {
  updataUnit,
  getUnits,
  createUnit,
  deleteUnit,
  getUnit,
} = require("../services/UnitServices");

const unitRout = express.Router();
unitRout.route("/").get(getUnits).post(createUnit);
unitRout.route("/:id").get(getUnit).put(updataUnit).delete(deleteUnit);

module.exports = unitRout;
