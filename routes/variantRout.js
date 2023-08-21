const express = require("express");

const {
  getVariant,
  getVariants,
  updataeVariant,
  deleteVariant,
  createVariant,
} = require("../services/variantsServices");

const variantRout = express.Router();

variantRout.route("/").get(getVariants).post(createVariant);

variantRout
  .route("/:id")
  .get(getVariant)
  .put(updataeVariant)
  .delete(deleteVariant);
module.exports = variantRout;
