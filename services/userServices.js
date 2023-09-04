const asyncHandler = require("express-async-handler");
const userModel = require("../models/userModel");
const ApiError = require("../utils/apiError");
const { default: slugify } = require("slugify");

//@desc Get list of User
// @rout Get /api/user
// @access priveta
exports.getUsers = asyncHandler(async (req, res) => {
  const user = await userModel
    .find()
    .populate({ path: "role", select: "name -_id" });

  res.status(200).json({ status: "true", results: user.length, data: user });
});

//@desc Create specific User
// @rout Post /api/user
// @access priveta
exports.createUser = asyncHandler(async (req, res) => {
  req.body.slug = slugify(req.body.name);
  const user = await userModel.create(req.body);
  res
    .status(201)
    .json({ status: "true", message: "User Inserted", data: user });
});

//@desc get specific User by id
// @rout Get /api/user/:id
// @access priveta
exports.getUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = await userModel
    .findById(id)
    .populate({ path: "role", select: "name -_id" });
  if (!user) {
    return next(new ApiError(`No user by this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", data: user });
});

//@desc Delete specific User
// @rout Delete /api/user/:id
// @access priveta
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = await userModel.findByIdAndDelete(id);
  if (!user) {
    return next(new ApiError(`No user by this id ${id}`, 404));
  }
  res.status(204).json({ status: "true", message: "User Deleted" });
});
