const express = require("express");

const {
  getVariantsName,
  createVariantName,
  getVariantName,
  updataeVariantName,
  deleteVariantName,
  setCategoryIdToBody,
  createFilterObj,
} = require("../services/variantItemName");

const variantNameRout = express.Router();

variantNameRout
  .route("/")
  .get(createFilterObj,getVariantsName)
  .post(setCategoryIdToBody, createVariantName);

variantNameRout
  .route("/:id")
  .get(getVariantName)
  .put(updataeVariantName)
  .delete(deleteVariantName);
module.exports = variantNameRout;
