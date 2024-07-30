const express = require("express");
const E_userRoute = express.Router();
const {
  createUser,
  getUsers,
  getOneUser,
  updateUser,
  deleteUser,
  updateUserPassword,
} = require("../../services/ecommerce/EcommerceUserServices");

E_userRoute.route("/").post(createUser).get(getUsers);
E_userRoute.route("/:id").get(getOneUser).put(updateUser).delete(deleteUser);
E_userRoute.route("/updatePassword").put(updateUserPassword);
E_userRoute.route("/e-edit/:id").put(updateUser);
module.exports = E_userRoute;
