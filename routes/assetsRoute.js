const express = require("express");
const {
  createAssets,
  getAssets,
  updateAsset,
  deleteAsset,
} = require("../services/assateServices");
const authService = require("../services/authService");

const assetsRout = express.Router();
assetsRout.use(authService.protect);

assetsRout.route("/").post(createAssets).get(getAssets);
assetsRout.route("/:id").put(updateAsset).get(getAssets).delete(deleteAsset);

module.exports = assetsRout;
