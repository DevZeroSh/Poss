const asyncHandler = require("express-async-handler");
const ApiError = require("../../utils/apiError");
const mongoose = require("mongoose");
const manitenaceUserSchema = require("../../models/maintenance/manitenaceUserModel");

// @desc  Get All Manitenace User
// @route Get /api/manituser
exports.getManitenaceUser = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const manitUserModel = db.model("manitUser", manitenaceUserSchema);
  const pageSize = req.query.limit || 25;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  let query = {};
  if (req.query.keyword) {
    query.$or = [
      { userName: { $regex: req.query.keyword, $options: "i" } },
      { userPhone: { $regex: req.query.keyword, $options: "i" } },
    ];
  }

  const totalItems = await manitUserModel.countDocuments(query);

  const totalPages = Math.ceil(totalItems / pageSize);

  const manitUser = await manitUserModel
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize);

  res.status(200).json({
    status: "true",
    results: manitUser.length,
    Pages: totalPages,
    data: manitUser,
  });
});

// @desc put update Manitenace User
// @route put /api/manituser/:id
exports.updateManitenaceUser = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const manitUserModel = db.model("manitUser", manitenaceUserSchema);
  const { id } = req.params;
  const manitUser = await manitUserModel.findByIdAndUpdate(id, req.body, {
    new: true,
  });

  if (!manitUser) {
    return next(new ApiError(`No Diveces with this id ${id}`));
  }

  res.status(200).json({ success: "success", data: manitUser });
});

// @desc Get one Manitenace User
// @route get /api/manituser/:id
exports.getOneManitenaceUser = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const manitUserModel = db.model("manitUser", manitenaceUserSchema);

  const { id } = req.params;

  const manitUser = await manitUserModel.findById(id);

  if (!manitUser) {
    return next(new ApiError(`No Devices By this ID ${id}`));
  }

  res.status(200).json({ message: "success", data: manitUser });
});
// @desc post Manitenace User
// @route post /api/manituser
exports.createManitenaceUser = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const manitUserModel = db.model("manitUser", manitenaceUserSchema);

  const nextCounter = (await manitUserModel.countDocuments()) + 1;

  req.body.counter = nextCounter;
  const createed = await manitUserModel.create(req.body);
  res.status(200).json({
    success: "success",
    message: "Manitenace User  inserted",
    data: createed,
  });
});
// @desc delete Manitenace User
// @route delete /api/manituser/id
exports.deleteManitenaceUser = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const manitUserModel = db.model("manitUser", manitenaceUserSchema);
  const { id } = req.params;

  const manitUser = await manitUserModel.findByIdAndDelete(id);

  if (!manitUser) {
    return next(new ApiError(`not Fund for device with id ${id}`));
  }
  res
    .status(200)
    .json({ success: "success", message: "Manitenace User has deleted" });
});
