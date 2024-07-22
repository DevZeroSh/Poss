const asyncHandler = require("express-async-handler");
const ApiError = require("../../utils/apiError");
const { default: slugify } = require("slugify");
const mongoose = require("mongoose");
const devicesSchema = require("../../models/maintenance/devicesModel");


exports.getDevices = asyncHandler(async (req, res, next) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);

    const deviceModel = db.model("Device", devicesSchema);
    const pageSize = req.query.limit || 25;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * pageSize;
    let query = {};
    if (req.query.keyword) {
        query.$or = [
            { admin: { $regex: req.query.keyword, $options: "i" } },
            { customerName: { $regex: req.query.keyword, $options: "i" } },
            { customerPhone: { $regex: req.query.keyword, $options: "i" } }
        ]
    }

    const totalItems = await deviceModel.countDocuments(query);

    const totalPages = Math.ceil(totalItems / pageSize);

    const device = await deviceModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize);

    res.status(200).json({
        status: "true",
        results: device.length,
        Pages: totalPages,
        data: device
    })
});

exports.updateDevices = asyncHandler(async (req, res, next) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);

    const deviceModel = db.model("Device", devicesSchema);

    const { id } = req.params;

    const devicesUpdate = await deviceModel.findByIdAndUpdate(id, req.body, { new: true })

    if (!devicesUpdate) {
        return next(new ApiError(`No Diveces with this id ${id}`));
    }

    res.status(200).json({ success: true, data: devicesUpdate });
})

exports.getOneDevice = asyncHandler(async (req, res, next) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);

    const deviceModel = db.model("Device", devicesSchema);

    const { id } = req.params

    const findDevice = await deviceModel.findById(id);

    if (!findDevice) {
        return next(new ApiError(`No Devices By this ID ${id}`));
    }

    res.status(200).json({ message: "success", data: findDevice })
})

exports.createDevice = asyncHandler(async (req, res, next) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);

    const deviceModel = db.model("Device", devicesSchema);

    const createed = await deviceModel.create(req.body);

    res.status(200).json({ success: "success", message: "devices inserted", data: createed })
})

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
})