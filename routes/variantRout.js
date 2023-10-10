const express = require("express");

const {
  getVariant,
  getVariants,
  updataeVariant,
  deleteVariant,
  createVariant,
} = require("../services/variantsServices");
const authService = require('../services/authService');
const variantRout = express.Router();
variantRout.use(authService.protect);

variantRout.route("/").get(getVariants).post(createVariant);

variantRout
  .route("/:id")
  .get(getVariant)
  .put(updataeVariant)
  .delete(deleteVariant);
module.exports = variantRout;
