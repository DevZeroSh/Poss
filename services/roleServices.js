const asyncHandler = require("express-async-handler");
const RoleModel    = require("../models/roleModel");
const ApiError     = require("../utils/apiError");


//@desc Get list of Role
//@route GEt  /api/role
//@accsess Private
exports.getRoles = asyncHandler(async (req, res) => {
  const role = await RoleModel.find()
    .populate({ path: "rolesDashboard", select: "title _id" })
    .populate({ path: "rolesPos", select: "title _id" });
  res.status(200).json({ status: "true", data: role });
});


//@desc Create Role
//@route Post /api/role
//@access Private
exports.createRole = asyncHandler(async (req, res, next) => {

  const role = await RoleModel.create(req.body);
  res.status(200).json({ status: "true", message: "Role Inserted", data: role });

});


//@desc Get specific Role by id
//@route Get /api/role/:id
//@access Private
exports.getRole = asyncHandler(async (req, res, next) => {

  const { id } = req.params;
  const role = await RoleModel.findById(id)
    .populate({ path: "rolesDashboard", select: "title _id" })
    .populate({ path: "rolesPos", select: "title _id" });
  if (!role) {
    return next(new ApiError(`No Role for this id ${id}`, 404));
  }
  res.status(201).json({ status: "true", data: role });

});


//@desc update specific Role by id
//@route Put /api/role/:id
//@access Private
exports.updataRole = asyncHandler(async (req, res, next) => {

  const { id } = req.params;
  const role = await RoleModel.findByIdAndUpdate({ _id: id }, req.body, {
    new: true,
  })
    .populate({ path: "rolesDashboard", select: "title _id" })
    .populate({ path: "rolesPos", select: "title _id" });
  if (!role) {
    return next(new ApiError(`No Role for this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", message: "Role updated", data: role });

});


//@desc Delete specific Role
//@rout Delete /api/role/:id
//@access priveta
exports.deleteRole = asyncHandler(async (req, res, next) => {

  const { id } = req.params;
  const role = await RoleModel.findByIdAndDelete(id);
  if (!role) {
    return next(new ApiError(`No Role for this id ${id}`, 404));
  }

  res.status(200).json({ status: "true", message: "Role Deleted" });
});


