const express = require("express");
const router = express.Router();
const authService = require("../services/authService");
const {
  createCustomar,
  getCustomars,
  getCustomar,
  updataCustomar,
  deleteCustomar,
} = require("../services/customarServices");
const {
  createCustomarVlaidator,
  updataCustomarVlaidator,
  getCustomarVlaidator,
  deleteCustomarVlaidator,
} = require("../utils/validators/customarValidator");
router
.route("/e-edit/:id").put(authService.ecommerceProtect, updataCustomar)
router
  .route("/")
  .post(authService.protect, createCustomar)
  .get(authService.protect, getCustomars);
router
  .route("/:id")
  .get(authService.protect, getCustomarVlaidator, getCustomar)
  .put(authService.protect, updataCustomar)
  .delete(authService.protect, deleteCustomar);


module.exports = router;
