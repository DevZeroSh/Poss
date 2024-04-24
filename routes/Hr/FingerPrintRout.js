const express = require("express");

const authService = require("../../services/authService");
const {
  createFingerPrint,
  getFingerPrint,
  deleteFingerprint,
  updateFingerPrint,
  getOneFingerPrint,
} = require("../../services/Hr/fingerPrintServices");

const fingerPrintRout = express.Router();
fingerPrintRout.use(authService.protect);

fingerPrintRout.route("/").post(createFingerPrint).get(getFingerPrint);

fingerPrintRout
  .route("/:id")
  .get(getOneFingerPrint)
  .delete(deleteFingerprint)
  .put(updateFingerPrint);
module.exports = fingerPrintRout;
