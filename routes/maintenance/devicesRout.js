const express = require("express");

const authService = require("../../services/authService");
const {
  getOneDevice,
  createDevice,
  getDevices,
  updateDevices,
  deleteDevice,
  addProductInDevice,
  convertToSales,
} = require("../../services/maintenance/devicesService");

const devicesRout = express.Router();

devicesRout.route("/").get(getDevices).post(authService.protect, createDevice);
devicesRout.route("/add/:id").put(authService.protect, addProductInDevice);
devicesRout.route("/convert/:id").put(authService.protect, convertToSales);

devicesRout
  .route("/:id")
  .get(getOneDevice)
  .put(authService.protect, updateDevices)
  .delete(authService.protect, deleteDevice);

module.exports = devicesRout;
