const express = require("express");
const {
  getAccountingTree,
  createAccountingTree,
  updateAccountingTree,
  getAccountingTreeByCode,
  deleteAccountingTree,
  getAccountingTreeNoBalance,
  importAccountingTree,
  changeBalance,
} = require("../services/accountingTreeServices");
const authService = require("../services/authService");
const multer = require("multer");
const upload = multer();
const accountingTreeRout = express.Router();

accountingTreeRout.use(authService.protect);

accountingTreeRout.route("/").get(getAccountingTree).post(createAccountingTree);
accountingTreeRout.route("/tree").get(getAccountingTreeNoBalance);
accountingTreeRout
  .route("/import")
  .post(upload.single("file"), importAccountingTree);
accountingTreeRout.route("/change/:id").put(changeBalance);
accountingTreeRout
  .route("/:id")
  .put(updateAccountingTree)
  .get(getAccountingTreeByCode)
  .delete(deleteAccountingTree);
module.exports = accountingTreeRout;
