const asyncHandler = require("express-async-handler");
const RoleModel = require("../models/roleModel");
const ApiError = require("../utils/apiError");
const { default: slugify } = require("slugify");

exports.getRoles = asyncHandler(async (req, res) => {
  const role = await RoleModel.find();
  res.status(200).json({ results: role.length, data: role });
});

exports.createRole = asyncHandler(async (req, res, next) => {
  const { name, description } = req.body;
  const role = await RoleModel.create({
    name,
    description,
    slug: slugify(name),
  });
  res.status(200).json({ data: role });
});

exports.getRole = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const role = await RoleModel.findById(id);
  if (!role) {
    return next(new ApiError(`No Role for this id ${id}`, 404));
  }
  res.status(201).json({ data: role });
});

exports.updataRole = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const role = await RoleModel.findByIdAndUpdate(
    { _id: id },
    { name, slug: slugify(name), description },
    { new: true }
  );
  if (!role) {
    return next(new ApiError(`No Role for this id ${id}`, 404));
  }
  res.status(200).json({ data: role });
});

exports.deleteRole = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const role = await RoleModel.findByIdAndDelete(id);
  if (!role) {
    return next(new ApiError(`No Role for this id ${id}`, 404));
  }
  res.status(204).send();
});
