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

LabelRout.route("/")
    .get(getLabels)
    .post(authService.allowedTo("new label"),createLabel);

LabelRout.route("/:id")
    .get(getLabel)
    .put(authService.allowedTo("edit label"),updataLabel)
    .delete(authService.allowedTo("delete label"),deleteLabel);

module.exports = LabelRout;
