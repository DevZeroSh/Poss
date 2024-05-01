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

const authService = require("../services/authService");

const brandRout = express.Router();


brandRout.route("/").get(getBrands).post(authService.protect,createBrandValidator, createBrand);
brandRout
  .route("/:id")
  .get(getBrandValidator, getBrand)
  .put(authService.protect,updataBrandValidator, updataBrand)
  .delete(authService.protect,deleteBrandValidator, deleteBrand);

module.exports = brandRout;
