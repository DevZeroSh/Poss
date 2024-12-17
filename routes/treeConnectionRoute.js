const express = require("express");

const authService = require("../services/authService");
const {
  getAllTreeConnection,
  createTreeConnection,
} = require("../services/treeConnectionService");

const treeConnectionRoute = express.Router();

treeConnectionRoute.use(authService.protect);

treeConnectionRoute
  .route("/")
  .get(getAllTreeConnection)
  .post(createTreeConnection);
module.exports = treeConnectionRoute;
