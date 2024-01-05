const asyncHandler = require("express-async-handler");
const rolePosModel = require("../models/rolePosModel");
const rolePosSchema = require("../models/rolePosModel");

//get all roles dashboard
//admin
exports.getRolePos = asyncHandler(async (req, res, next) => {
    const rolesPos = await rolePosModel.find();
    res.status(201).json({ status: "true", data: rolesPos });
});

//get roles on array of ids
exports.getPosRoles = async (ids, db) => {
    const rolesModel = db.model("RolePos", rolePosSchema);

    const posRoles = await rolesModel.find({ _id: { $in: ids } }).select("-_id title");

    const titles = posRoles.map((role) => role.title);

    return titles;
};
