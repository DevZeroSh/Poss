const express = require("express");

const authService = require("../../services/authService");
const {
  getManitenaceUser,
  updateManitenaceUser,
  getOneManitenaceUser,
  createManitenaceUser,
  deleteManitenaceUser,
} = require("../../services/maintenance/maintenanceUserService");
const { getDevicesByUserID } = require("../../services/maintenance/devicesService");

const manitUserRout = express.Router();
manitUserRout.use(authService.protect);

manitUserRout.route("/").get(getManitenaceUser).post(createManitenaceUser);
manitUserRout.route("/devices/:id").get(getDevicesByUserID)

manitUserRout
  .route("/:id")
  .get(getOneManitenaceUser)
  .put(updateManitenaceUser)
  .delete(deleteManitenaceUser);

module.exports = manitUserRout;
