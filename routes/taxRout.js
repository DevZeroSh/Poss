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

taxRout.route("/").get(getTax).post(createTax);
taxRout.route("/:id").get(getOneTax).put(updataTax).delete(deleteTax);

module.exports = taxRout;
