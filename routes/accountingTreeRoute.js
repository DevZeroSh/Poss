const express = require("express");
const {
  getAccountingTree,
  createAccountingTree,
} = require("../services/AccountingTreeServices");

const accountingTreeRout = express.Router();

accountingTreeRout.route("/").get(getAccountingTree).post(createAccountingTree);

module.exports = accountingTreeRout;
