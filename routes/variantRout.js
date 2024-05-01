const express = require("express");

const {
  getVariant,
  getVariants,
  updataeVariant,
  deleteVariant,
  createVariant,
} = require("../services/variantsServices");
const authService = require("../services/authService");
const variantRout = express.Router();


variantRout.route("/").get(getVariants).post(authService.protect,createVariant);

variantRout
  .route("/:id")
  .get(getVariant)
  .put(authService.protect,updataeVariant)
  .delete(authService.protect,deleteVariant);

module.exports = variantRout;
