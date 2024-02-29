const express = require("express");
const {
  getLabels,
  createLabel,
  getLabel,
  updataLabel,
  deleteLabel,
} = require("../services/labelsServices");

const authService = require("../services/authService");
const LabelRout = express.Router();
LabelRout.use(authService.protect);
// authService.allowedTo("label"),
  LabelRout.route("/")
    .get(getLabels)
    .post(authService.allowedTo("new Definitions"), createLabel);

LabelRout.route("/:id")
  .get(getLabel)
  .put(authService.allowedTo("edit Definitions"), updataLabel)
  .delete(authService.allowedTo("delete Definitions"), deleteLabel);

module.exports = LabelRout;
