const asyncHandler = require("express-async-handler");
const RoleDashboardModel = require("../models/roleDashboardModel");
const roleDashboardSchema = require("../models/roleDashboardModel");

//get all roles dashboard
//admin
exports.getRoleDashboard = asyncHandler(async (req, res, next) => {
    const rolesDashboard = await RoleDashboardModel.find();
    res.status(201).json({ status: "true", data: rolesDashboard });
});

//get roles on array of ids
exports.getDashboardRoles = async (ids, db) => {
    const dashboardModel = db.model("RoleDashboard", roleDashboardSchema);
    const dashboardRoles = await dashboardModel.find({ _id: { $in: ids } }).select("-_id title");

    const titles = dashboardRoles.map((role) => role.title);

    return titles;
};
