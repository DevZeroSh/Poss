const express = require("express");
const { createAssts } = require("../services/assateServices");

const assetsRout = express.Router();

assetsRout.route("/").post(createAssts);

module.exports = assetsRout;
