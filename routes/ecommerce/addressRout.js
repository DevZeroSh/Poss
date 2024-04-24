const express = require("express");

const authService = require("../../services/authService");
const {
  addAddress,
  getLoggedUserAddresses,
  removeAddress,
} = require("../../services/ecommerce/addressService");

const addressRout = express.Router();

addressRout.use(authService.ecommerceProtect);

addressRout.route("/").post(addAddress).get(getLoggedUserAddresses);

addressRout.delete("/:addressId", removeAddress);

module.exports = addressRout;
