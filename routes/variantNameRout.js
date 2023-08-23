const express = require("express");

const {
  getVariantsName,
  createVariantName,
  getVariantName,
  updataeVariantName,
  deleteVariantName,
} = require("../services/variantItemName");

const variantNameRout = express.Router();

variantNameRout.route("/").get(getVariantsName).post(createVariantName);

variantNameRout
  .route("/:id")
  .get(getVariantName)
  .put(updataeVariantName)
  .delete(deleteVariantName);
module.exports = variantNameRout;
