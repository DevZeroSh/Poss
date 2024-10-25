const express = require("express");
const {
  getAccountingTree,
  createAccountingTree,
  updateAccountingTree,
  getAccountingTreeByCode,
  deleteAccountingTree,
} = require("../services/accountingTreeServices");
const authService = require("../services/authService");

const accountingTreeRout = express.Router();

accountingTreeRout.use(authService.protect);

accountingTreeRout.route("/").get(getAccountingTree).post(createAccountingTree);
accountingTreeRout
  .route("/:id")
  .put(updateAccountingTree)
  .get(getAccountingTreeByCode).delete(deleteAccountingTree);
module.exports = accountingTreeRout;
