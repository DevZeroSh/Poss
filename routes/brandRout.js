const express = require("express");
const {
  getBrands,
  createBrand,
  updataBrand,
  deleteBrand,
  getBrand,
} = require("../services/brandServices");
const {
  createBrandValidator,
  getBrandValidator,
  updataBrandValidator,
  deleteBrandValidator,
} = require("../utils/validators/brandValidator");

const authService = require('../services/authService');

const brandRout = express.Router();
brandRout.use(authService.protect);

brandRout.route("/").get(getBrands).post(createBrandValidator, createBrand);
brandRout
  .route("/:id")
  .get(getBrandValidator, getBrand)
  .put(updataBrandValidator, updataBrand)
  .delete(deleteBrandValidator, deleteBrand);

module.exports = brandRout;
