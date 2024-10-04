const asyncHandler = require("express-async-handler");
const ApiError = require("../../utils/apiError");
const mongoose = require("mongoose");
const devicesSchema = require("../../models/maintenance/devicesModel");
const manitencesCaseSchema = require("../../models/maintenance/manitencesCaseModel");
const caseHitstorySchema = require("../../models/maintenance/caseHistoryModel");
const manitenaceUserSchema = require("../../models/maintenance/manitenaceUserModel");
const xlsx = require("xlsx");

// @desc Get All Devices
// @route get /api/device
exports.getDevices = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const deviceModel = db.model("Device", devicesSchema);
  const manitUserModel = db.model("manitUser", manitenaceUserSchema);

  const pageSize = req.query.limit || 20;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  let query = {};
  let userIds = [];

  // If a keyword is provided, search in device fields
  if (req.query.keyword) {
    query.$or = [
      { deviceModel: { $regex: req.query.keyword, $options: "i" } },
      { serialNumber: { $regex: req.query.keyword, $options: "i" } },
      { counter: { $regex: req.query.keyword, $options: "i" } },
    ];

    // Search for users with matching userName OR userPhone and get their IDs
    const users = await manitUserModel.find(
      {
        $or: [
          { userName: { $regex: req.query.keyword, $options: "i" } },
          { userPhone: { $regex: req.query.keyword, $options: "i" } },
        ],
      },
      "_id"
    );

    userIds = users.map((user) => user._id);
  }

  // If userIds are found, include them in the query
  if (userIds.length > 0) {
    query.$or.push({ userId: { $in: userIds } });
  }

  const totalItems = await deviceModel.countDocuments(query);
  const totalPages = Math.ceil(totalItems / pageSize);

  const device = await deviceModel
    .find(query)
    .populate({ path: "userId", select: "userName userPhone" }) // Populate relevant fields
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

  const { id } = req.params;

  const devicesUpdate = await deviceModel.findByIdAndUpdate(id, req.body, {
    new: true,
  });

  if (!devicesUpdate) {
    return next(new ApiError(`No Diveces with this id ${id}`));
  }

  res.status(200).json({ success: "success", data: devicesUpdate });
});
// @desc Get one Devices
// @route get /api/device/id
exports.getOneDevice = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  db.model("manitUser", manitenaceUserSchema);
  const deviceModel = db.model("Device", devicesSchema);

  const { id } = req.params;

  const findDevice = await deviceModel.findById(id).populate("userId");

  if (!findDevice) {
    return next(new ApiError(`No Devices By this ID ${id}`));
  }

  res.status(200).json({ message: "success", data: findDevice });
});
// @desc post Devices
// @route post /api/device
exports.createDevice = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const deviceModel = db.model("Device", devicesSchema);
  const maintenacesHistoryModel = db.model(
    "maintenacesHistory",
    caseHitstorySchema
  );
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

  const milliseconds = ts;
  req.body.counter = nextCounter;
  const createed = await deviceModel.create(req.body);
  const nextCounterCase = (await manitencesCaseModel.countDocuments()) + 1;

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
    cable: req.body.cable,
    deviceReceptionDate: formattedDate,
    manitencesStatus: req.body.manitencesStatus,
    problemType: req.body.problemType,
    counter: milliseconds,
    manitencesStatus: "Received",
    caseCounter: 1068 + nextCounterCase,
  });

  await maintenacesHistoryModel.create({
    devicesId: createed.id,
    employeeName: req.user.name,
    date: formattedDate,
    counter: milliseconds,
    histoyType: "create",
    deviceStatus: req.body.deviceStatus,
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
  const pageSize = req.query.limit || 20;
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

exports.importDevice = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const deviceModel = db.model("Device", devicesSchema);
  const manitUserModel = db.model("manitUser", manitenaceUserSchema);
  const manitencesCaseModel = db.model("manitencesCase", manitencesCaseSchema);

  const { buffer } = req.file;

  let csvData;
  if (
    req.file.originalname.endsWith(".csv") ||
    req.file.mimetype === "text/csv"
  ) {
    // Use csvtojson to convert CSV buffer to JSON array
    csvData = await csvtojson().fromString(buffer.toString());
  } else if (
    req.file.originalname.endsWith(".xlsx") ||
    req.file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    // Use xlsx library to convert XLSX buffer to JSON array
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheet_name_list = workbook.SheetNames;
    csvData = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
  } else {
    return res.status(400).json({ error: "Unsupported file type" });
  }

  try {
    const csvDataWithUsers = await Promise.all(
      csvData.map(async (client, index) => {
        const user = await manitUserModel.findOne({
          userPhone: client.userPhone,
        });
        client.userId = user ? user._id.toString() : null;
        client.counter = index + 1;

        if (client.userId) {
          // Insert device first
          const createdDevice = await deviceModel.create(client);

          // Create associated maintenance case
          const createdCase = await manitencesCaseModel.create({
            userId: client.userId,
            deviceId: createdDevice._id,
            admin: client.admin,
            userNotes: client.userNotes,
            deviceProblem: client.deviceProblem,
            deviceStatus: client.deviceStatus,
            employeeDesc: client.employeeDesc,
            expectedAmount: client.expectedAmount,
            paymentStatus: "unpaid",
            deviceReceptionDate: client.date,
            manitencesStatus: client.manitencesStatus,
            problemType: client.problemType,
            counter: Date.now(),
            caseCounter: index, // Increment case counter
          });
        }

        return client; // Return the modified client with userId and possibly maintenance case
      })
    );

    // Filter out clients that didn't have a userId and therefore weren't processed
    const validData = csvDataWithUsers.filter((client) => client.userId);

    // Filter out clients without a userId

    res.status(200).json({
      status: "success",
      message: `${validData.length} devices and associated maintenance cases created successfully.`,
      data: validData,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while importing devices." });
  }
});
