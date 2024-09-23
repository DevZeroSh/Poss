const asyncHandler = require("express-async-handler");
const ApiError = require("../../utils/apiError");
const mongoose = require("mongoose");
const devicesSchema = require("../../models/maintenance/devicesModel");
const manitencesCaseSchema = require("../../models/maintenance/manitencesCaseModel");
const devicesHitstorySchema = require("../../models/maintenance/devicesHistoryModel");
const manitenaceUserSchema = require("../../models/maintenance/manitenaceUserModel");

// @desc Get All Devices
// @route get /api/device
exports.getDevices = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const deviceModel = db.model("Device", devicesSchema);
  db.model("manitUser", manitenaceUserSchema);

  const pageSize = req.query.limit || 25;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  let query = {};
  if (req.query.keyword) {
    query.$or = [
      { customerName: { $regex: req.query.keyword, $options: "i" } },
      { customerPhone: { $regex: req.query.keyword, $options: "i" } },
    ];
  }

  const totalItems = await deviceModel.countDocuments(query);

  const totalPages = Math.ceil(totalItems / pageSize);

  const device = await deviceModel
    .find(query)
    .populate({ path: "userId" })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize);
  res.status(200).json({
    status: "true",
    results: device.length,
    Pages: totalPages,
    data: device,
  });
});

// @desc put update Devices
// @route put /api/device/:id
exports.updateDevices = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const deviceModel = db.model("Device", devicesSchema);
  const deviceHistoryModel = db.model("DeviceHistory", devicesHitstorySchema);

  const { id } = req.params;
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
  const devicesUpdate = await deviceModel.findByIdAndUpdate(id, req.body, {
    new: true,
  });

  if (!devicesUpdate) {
    return next(new ApiError(`No Diveces with this id ${id}`));
  }
  const history = await deviceHistoryModel.create({
    devicesId: id,
    employeeName: req.user.name,
    date: formattedDate,
    counter: devicesUpdate.counter,
    histoyType: "update",
    deviceStatus: req.body.deviceStatus,
    desc: req.body.desc,
  });

  res.status(200).json({ success: "success", data: devicesUpdate, history });
});
// @desc Get one Devices
// @route get /api/device/id
exports.getOneDevice = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  db.model("manitUser", manitenaceUserSchema);
  const deviceModel = db.model("Device", devicesSchema);
  const deviceHistoryModel = db.model("DeviceHistory", devicesHitstorySchema);

  const { id } = req.params;

  const findDevice = await deviceModel.findById(id);
  const history = await deviceHistoryModel
    .find({ devicesId: id })
    .sort({ date: -1 })
 
  if (!findDevice) {
    return next(new ApiError(`No Devices By this ID ${id}`));
  }

  res.status(200).json({ message: "success", data: findDevice, history });
});
// @desc post Devices
// @route post /api/device
exports.createDevice = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const deviceModel = db.model("Device", devicesSchema);
  const deviceHistoryModel = db.model("DeviceHistory", devicesHitstorySchema);
  const manitencesCaseModel = db.model("manitencesCase", manitencesCaseSchema);

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

  const nextCounter = (await deviceModel.countDocuments()) + 1;

  req.body.counter = nextCounter;
  const createed = await deviceModel.create(req.body);

  await deviceHistoryModel.create({
    devicesId: createed.id,
    employeeName: req.user.name,
    date: formattedDate,
    counter: "case " + nextCounter,
    histoyType: "create",
    manitencesStatus: req.body.manitencesStatus,
    desc: "Created Device",
  });
  const nextCounterCase = (await manitencesCaseModel.countDocuments()) + 1;

  req.body.counter = "case " + nextCounterCase;
  const createedCase = await manitencesCaseModel.create({
    userId: req.body.userId,
    deviceId: createed._id,
    admin: req.body.admin,
    userNotes: req.body.userNotes,
    deviceProblem: req.body.deviceProblem,
    deviceStatus: req.body.deviceStatus,
    employeeDesc: req.body.employeeDesc,
    expectedAmount: req.body.expectedAmount,
    paymentStatus: "unpaid",
    backpack: req.body.backpack,
    charger: req.body.charger,
    deviceReceptionDate: formattedDate,
    manitencesStatus: req.body.manitencesStatus,
    problemType: req.body.problemType,
  });

  await deviceHistoryModel.create({
    devicesId: createed.id,
    employeeName: req.user.name,
    date: formattedDate,
    counter: "case " + nextCounter,
    histoyType: "create",
    deviceStatus: req.body.deviceStatus,
    desc: "Created case",
  });

  res.status(200).json({
    status: "success",
    message: "devices inserted",
    data: createed,
    deviceCase: createedCase,
  });
});
// @desc delete delete Devices
// @route delete /api/device/id
exports.deleteDevice = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const deviceModel = db.model("Device", devicesSchema);
  const { id } = req.params;

  const deleteDevice = await deviceModel.findByIdAndDelete(id);

  if (!deleteDevice) {
    return next(new ApiError(`not Fund for device with id ${id}`));
  }
  res.status(200).json({ success: "success", message: "devices has deleted" });
});

exports.getDevicesByUserID = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const { id } = req.params;
  db.model("manitUser", manitenaceUserSchema);

  const deviceModel = db.model("Device", devicesSchema);
  const pageSize = req.query.limit || 25;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  const totalItems = await deviceModel.countDocuments();

  const totalPages = Math.ceil(totalItems / pageSize);

  const device = await deviceModel
    .find({ userId: id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize);

  res.status(200).json({
    status: "true",
    results: device.length,
    Pages: totalPages,
    data: device,
  });
});
