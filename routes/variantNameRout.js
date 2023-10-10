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

const authService = require("../services/authService");
const variantNameRout = express.Router();
variantNameRout.use(authService.protect);

variantNameRout
    .route("/")
    .get(createFilterObj, getVariantsName)
    .post(setCategoryIdToBody, createVariantName);

variantNameRout
    .route("/:id")
    .get(getVariantName)
    .put(updataeVariantName)
    .delete(deleteVariantName);
module.exports = variantNameRout;
