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

variantRout.route("/")
    .get(authService.allowedTo("variant"), getVariants)
    .post(authService.allowedTo("new variant"), createVariant);

variantRout.route("/:id")
    .get(authService.allowedTo("variant"), getVariant)
    .put(authService.allowedTo("edit variant"), updataeVariant)
    .delete(authService.allowedTo("delete variant"), deleteVariant);
    
module.exports = variantRout;
