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
    .get(authService.allowedTo("label"),getLabels)
    .post(authService.allowedTo("new label"),createLabel);

LabelRout.route("/:id")
    .get(authService.allowedTo("label"),getLabel)
    .put(authService.allowedTo("edit label"),updataLabel)
    .delete(authService.allowedTo("delete label"),deleteLabel);

module.exports = LabelRout;
