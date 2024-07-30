const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const E_user_Schema = require("../../models/ecommerce/E_user_Modal");
const { Search } = require("../../utils/search");
const bcrypt = require("bcrypt");
const createToken = require("../../utils/createToken");
const ApiError = require("../../utils/apiError");
// Create New customer
exports.createUser = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const UserModel = db.model("Users", E_user_Schema);
  try {
    const user = await UserModel.create(req.body);
    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});
//Get All Users
exports.getUsers = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const UserModel = db.model("Users", E_user_Schema);
  const { totalPages, mongooseQuery } = await Search(UserModel, req);
  const users = await mongooseQuery;
  res.status(200).json({
    status: "true",
    totalPages: totalPages,
    results: users.length,
    data: users,
  });
});

//Get One user

exports.getOneUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const UserModel = db.model("Users", E_user_Schema);
  const user = await UserModel.findById(id);

  if (!user) {
    return next(new ApiError(`There is no customar with this id ${id}`, 404));
  } else {
    res.status(200).json({ status: "true", data: user });
  }
});

// Update user
exports.updateUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const UserModel = db.model("Users", E_user_Schema);

  const user = await UserModel.findById(id);
  if (!user) {
    return next(new ApiError(`There is no customer with this id: ${id}`, 404));
  } else {
    const updatedUser = await UserModel.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({
      success: true,
      message: "Customer updated",
      data: updatedUser,
    });
  }
});
// updat user Password
exports.updateUserPassword = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const UserModel = db.model("Users", E_user_Schema);

  // Update user password based on user payload (req.user._id)
  const user = await UserModel.findByIdAndUpdate(
    req.user._id,
    {
      password: await bcrypt.hash(req.body.newPassword, 12),
      passwordChangedAt: Date.now(),
    },
    {
      new: true,
    }
  );

  if (!user) {
    return new ApiError("User not found", 404);
  }

  // Generate Token
  const token = createToken(user._id);
  user.password = undefined;
  res.status(200).json({ data: user, token });
});
// Delete user
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const UserModel = db.model("Users", E_user_Schema);

  const user = await UserModel.findByIdAndDelete(id);

  if (!user) {
    return next(new ApiError(`There is no user with this id ${id}`, 404));
  } else {
    res.status(200).json({ status: "true", message: "User Deleted" });
  }
});
