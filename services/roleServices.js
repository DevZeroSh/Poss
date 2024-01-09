const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const rolesShcema = require("../models/roleModel");
const roleDashboardSchema = require("../models/roleDashboardModel");
const rolePosSchema = require("../models/rolePosModel");

//@desc Get list of Role
//@route GEt  /api/role
//@accsess Private
exports.getRoles = asyncHandler(async (req, res) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const rolesModel = db.model("Roles", rolesShcema);

    db.model("RoleDashboard", roleDashboardSchema);
    db.model("RolePos", rolePosSchema);

    const role = await rolesModel
        .find()
        .populate({ path: "rolesDashboard", select: "title _id" })
        .populate({ path: "rolesPos", select: "title _id" });
    res.status(200).json({ status: "true", data: role });
});

//@desc Create Role
//@route Post /api/role
//@access Private
exports.createRole = asyncHandler(async (req, res, next) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const rolesModel = db.model("Roles", rolesShcema);
    const role = await rolesModel.create(req.body);
    res.status(200).json({ status: "true", message: "Role Inserted", data: role });
});

//@desc Get specific Role by id
//@route Get /api/role/:id
//@access Private
exports.getRole = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const rolesModel = db.model("Roles", rolesShcema);

    db.model("RoleDashboard", roleDashboardSchema);
    db.model("RolePos", rolePosSchema);

    const role = await rolesModel
        .findById(id)
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

    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const rolesModel = db.model("Roles", rolesShcema);

    db.model("RoleDashboard", roleDashboardSchema);
    db.model("RolePos", rolePosSchema);

    const role = await rolesModel
        .findByIdAndUpdate({ _id: id }, req.body, {
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

    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const rolesModel = db.model("Roles", rolesShcema);
    const role = await rolesModel.findByIdAndDelete(id);
    if (!role) {
        return next(new ApiError(`No Role for this id ${id}`, 404));
    }

    res.status(200).json({ status: "true", message: "Role Deleted" });
});
