const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const rolePosSchema = require("../models/rolePosModel");

//get all roles dashboard
//admin
exports.getRolePos = asyncHandler(async (req, res, next) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const rolesModel = db.model("RolePos", rolePosSchema);

    const rolesPos = await rolesModel.find();
    res.status(201).json({ status: "true", data: rolesPos });
});

//get roles on array of ids
exports.getPosRoles = async (ids, db) => {
    const rolesModel = db.model("RolePos", rolePosSchema);

    const posRoles = await rolesModel.find({ _id: { $in: ids } }).select("-_id title");

    const titles = posRoles.map((role) => role.title);

    return titles;
};
