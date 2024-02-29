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
    .get(getUnits)
    .post(authService.allowedTo("new Definitions"), createUnitValidator, createUnit);
unitRout.route("/:id")
    .get(getUnitValidator, getUnit)
    .put(authService.allowedTo("edit Definitions"), updataUnitValidator, updataUnit)
    .delete(
        authService.allowedTo("delete Definitions"),
        deleteUnitValidator,
        deleteUnit
    );

module.exports = unitRout;
