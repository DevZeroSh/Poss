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
    .get(getTax)
    .post(authService.allowedTo("new Definitions"), createTax);
taxRout
    .route("/:id")
    .get(getOneTax)
    .put(authService.allowedTo("edit Definitions"), updataTax)
    .delete(authService.allowedTo("delete Definitions"), deleteTax);

module.exports = taxRout;
