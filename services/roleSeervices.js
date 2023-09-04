const asyncHandler = require("express-async-handler");
const RoleModel = require("../models/roleModel");
const ApiError = require("../utils/apiError");
const { default: slugify } = require("slugify");

//@desc Get list of Role
//@route GEt  /api/role
//@accsess Private
exports.getRoles = asyncHandler(async (req, res) => {
  const role = await RoleModel.find();
  res.status(200).json({ status: "true", results: role.length, data: role });
});
//@desc Create Role
//@route Post /api/role
//@access Private
exports.createRole = asyncHandler(async (req, res, next) => {
  const { name, description } = req.body;
  const role = await RoleModel.create({
    name,
    description,
    slug: slugify(name),
  });
  res
    .status(200)
    .json({ status: "true", message: "Role Inserted", data: role });
});

//@desc Get specific Role by id
//@route Get /api/role/:id
//@access Private
exports.getRole = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const role = await RoleModel.findById(id);
  if (!role) {
    return next(new ApiError(`No Role for this id ${id}`, 404));
  }
  res.status(201).json({ status: "true", data: role });
});
//@desc Get specific Role by id
//@route Put /api/role/:id
//@access Private
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
  res.status(200).json({ status: "true", message: "Role updated", data: role });
});

//@desc Delete specific Role
// @rout Delete /api/role/:id
// @access priveta
exports.deleteRole = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const role = await RoleModel.findByIdAndDelete(id);
  if (!role) {
    return next(new ApiError(`No Role for this id ${id}`, 404));
  }
  res.status(204).json({ status: "true", message: "Role Deleted" });
});
