const express = require("express");
const {
  getDevices,
  createDevice,
  getOneDevice,
  updateDevices,
  deleteDevice,
} = require("../../services/maintenance/devicesService");

const devicesRout = express.Router();

devicesRout.route("/").get(getDevices).post(createDevice);
devicesRout
  .route("/:id")
  .get(getOneDevice)
  .put(updateDevices)
  .delete(deleteDevice);

module.exports = devicesRout;
