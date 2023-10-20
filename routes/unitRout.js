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

const authService = require("../services/authService");
const unitRout = express.Router();
unitRout.use(authService.protect);

unitRout.route("/")
    .get(authService.allowedTo("unit"), getUnits)
    .post(authService.allowedTo("new unit"), createUnitValidator, createUnit);
unitRout.route("/:id")
    .get(authService.allowedTo("unit"), getUnitValidator, getUnit)
    .put(authService.allowedTo("edit unit"), updataUnitValidator, updataUnit)
    .delete(
        authService.allowedTo("delete unit"),
        deleteUnitValidator,
        deleteUnit
    );

module.exports = unitRout;
