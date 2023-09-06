const express = require("express");

const {getRolePos} = require("../services/rolePosServices");

const RolePosRoute = express.Router();

RolePosRoute.route("/").get(getRolePos);

module.exports = RolePosRoute;