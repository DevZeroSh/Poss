const asyncHandler = require("express-async-handler");
const userModel = require("../models/userModel");
const ApiError = require("../utils/apiError");
const { default: slugify } = require("slugify");

exports.getUsers = asyncHandler(async (req, res) => {
  const user = await userModel
    .find()
    .populate({ path: "role", select: "name -_id" });

  res.status(200).json({ results: user.length, data: user });
});

exports.createUser = asyncHandler(async (req, res) => {
  req.body.slug = slugify(req.body.name);
  const user = await userModel.create(req.body);
  res.status(201).json({ data: user });
});

exports.getUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = await userModel
    .findById(id)
    .populate({ path: "role", select: "name -_id" });
  if (!user) {
    return next(new ApiError(`No user by this id ${id}`, 404));
  }
  res.status(200).json({ data: user });
});

exports.deleteUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = await userModel.findByIdAndDelete(id);
  if (!user) {
    return next(new ApiError(`No user by this id ${id}`, 404));
  }
  res.status(204).send();
});
