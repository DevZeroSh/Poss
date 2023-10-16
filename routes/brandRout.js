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
brandRout.use(authService.protect);

brandRout
    .route("/")
    .get(authService.allowedTo("brand"), getBrands)
    .post(
        authService.allowedTo("new brand"),
        createBrandValidator,
        createBrand
    );
brandRout
    .route("/:id")
    .get(authService.allowedTo("brand"),getBrandValidator, getBrand)
    .put(authService.allowedTo("edit brand"),updataBrandValidator, updataBrand)
    .delete(authService.allowedTo("delete brand"),deleteBrandValidator, deleteBrand);

module.exports = brandRout;
