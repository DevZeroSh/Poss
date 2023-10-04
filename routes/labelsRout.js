const express = require("express");
const {
  getLabels,
  createLabel,
  getLabel,
  updataLabel,
  deleteLabel,
} = require("../services/labelsServices");

const LabelRout = express.Router();

LabelRout.route("/").get(getLabels).post(createLabel);
LabelRout.route("/:id").get(getLabel).put(updataLabel).delete(deleteLabel);

module.exports = LabelRout;
