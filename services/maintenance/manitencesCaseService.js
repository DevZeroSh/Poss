const asyncHandler = require("express-async-handler");
const ApiError = require("../../utils/apiError");
const mongoose = require("mongoose");
const manitencesCase = require("../../models/maintenance/manitencesCaseModel");
const manitenaceUserSchema = require("../../models/maintenance/manitenaceUserModel");
const devicesSchema = require("../../models/maintenance/devicesModel");
const devicesHitstorySchema = require("../../models/maintenance/devicesHistoryModel");

// @desc  Get All Manitenace Case
// @route Get /api/manitCase
exports.getManitenaceCase = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const manitUserModel = db.model("manitUser", manitenaceUserSchema);
  const deviceModel = db.model("Device", devicesSchema);
  const manitencesCaseModel = db.model("manitencesCase", manitencesCase);

  const pageSize = req.query.limit || 25;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  let query = {};
  if (req.query.keyword) {
    query.$or = [
      { CaseName: { $regex: req.query.keyword, $options: "i" } },
      { CasePhone: { $regex: req.query.keyword, $options: "i" } },
    ];
  }

  const totalItems = await manitencesCaseModel.countDocuments(query);

  const totalPages = Math.ceil(totalItems / pageSize);

  const manitCase = await manitencesCaseModel
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .populate({ path: "userId", select: "userName userPhone " })
    .populate({ path: "deviceId" });

  res.status(200).json({
    status: "true",
    results: manitCase.length,
    Pages: totalPages,
    data: manitCase,
  });
});

// @desc put update Manitenace Case
// @route put /api/manitCase/:id
exports.updateManitenaceCase = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const manitencesCaseModel = db.model("manitencesCase", manitencesCase);
  const deviceHistoryModel = db.model("DeviceHistory", devicesHitstorySchema);

  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }
  const ts = Date.now();
  const date_ob = new Date(ts);
  const formattedDate = `${date_ob.getFullYear()}-${padZero(
    date_ob.getMonth() + 1
  )}-${padZero(date_ob.getDate())} ${padZero(date_ob.getHours())}:${padZero(
    date_ob.getMinutes()
  )}:${padZero(date_ob.getSeconds())}`;

  const { id } = req.params;

  const manitCase = await manitencesCaseModel.findByIdAndUpdate(id, req.body, {
    new: true,
  });
  if (!manitCase) {
    return next(new ApiError(`No Diveces with this id ${id}`));
  }
  await deviceHistoryModel.create({
    devicesId: id,
    name: req.user.name,
    date: formattedDate,
    counter: manitCase.counter,
    status: "update",
    devicesStatus: req.body.deviceStatus,
    desc: req.body.desc,
  });
  res.status(200).json({ success: "success", data: manitCase });
});

// @desc Get one Manitenace Case
// @route get /api/manitCase/:id
exports.getOneManitenaceCase = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const manitencesCaseModel = db.model("manitencesCase", manitencesCase);

  const { id } = req.params;

  const manitCase = await manitencesCaseModel.findById(id);

  if (!manitCase) {
    return next(new ApiError(`No Devices By this ID ${id}`));
  }

  res.status(200).json({ message: "success", data: manitCase });
});
// @desc post Manitenace Case
// @route post /api/manitCase
exports.createManitenaceCase = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const manitencesCaseModel = db.model("manitencesCase", manitencesCase);
  const deviceHistoryModel = db.model("DeviceHistory", devicesHitstorySchema);

  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }
  const ts = Date.now();
  const date_ob = new Date(ts);
  const formattedDate = `${date_ob.getFullYear()}-${padZero(
    date_ob.getMonth() + 1
  )}-${padZero(date_ob.getDate())} ${padZero(date_ob.getHours())}:${padZero(
    date_ob.getMinutes()
  )}:${padZero(date_ob.getSeconds())}`;

  const nextCounter = (await manitencesCaseModel.countDocuments()) + 1;

  req.body.counter = "case " + nextCounter;
  const createed = await manitencesCaseModel.create(req.body);

  await deviceHistoryModel.create({
    devicesId: createed.id,
    name: req.user.name,
    date: formattedDate,
    counter: "case " + nextCounter,
    status: "create",
    devicesStatus: req.body.deviceStatus,
    desc: "Created case",
  });

  res.status(200).json({
    success: "success",
    message: "Manitenace Case  inserted",
    data: createed,
  });
});
// @desc delete Manitenace Case
// @route delete /api/manitCase/id
exports.deleteManitenaceCase = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const manitencesCaseModel = db.model("manitencesCase", manitencesCase);
  const { id } = req.params;

  const manitCase = await manitencesCaseModel.findByIdAndDelete(id);

  if (!manitCase) {
    return next(new ApiError(`not Fund for device with id ${id}`));
  }
  res
    .status(200)
    .json({ success: "success", message: "Manitenace Case has deleted" });
});
