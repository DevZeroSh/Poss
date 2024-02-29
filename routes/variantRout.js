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
variantRout.use(authService.protect);

variantRout
  .route("/")
  .get(getVariants)
  .post(authService.allowedTo("new Definitions"), createVariant);

variantRout
  .route("/:id")
  .get(getVariant)
  .put(authService.allowedTo("edit Definitions"), updataeVariant)
  .delete(authService.allowedTo("delete Definitions"), deleteVariant);

module.exports = variantRout;
