const express = require("express");
const {
  getTax,
  createTax,
  getOneTax,
  updataTax,
  deleteTax,
} = require("../services/taxServices");

const taxRout = express.Router();
taxRout.route("/").get(getTax).post(createTax);
taxRout.route("/:id").get(getOneTax).put(updataTax).delete(deleteTax);

module.exports = taxRout;
