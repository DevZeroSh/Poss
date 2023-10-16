const express = require("express");
const {
    getTax,
    createTax,
    getOneTax,
    updataTax,
    deleteTax,
} = require("../services/taxServices");

const authService = require("../services/authService");
const taxRout = express.Router();
taxRout.use(authService.protect);

taxRout
    .route("/")
    .get(authService.allowedTo("tax"), getTax)
    .post(authService.allowedTo("new tax"), createTax);
taxRout
    .route("/:id")
    .get(authService.allowedTo("tax"), getOneTax)
    .put(authService.allowedTo("edit tax"), updataTax)
    .delete(authService.allowedTo("delete tax"), deleteTax);

module.exports = taxRout;
