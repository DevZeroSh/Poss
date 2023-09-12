const asyncHandler = require("express-async-handler");
const RoleDashboardModel = require("../models/roleDashboardModel");
const ApiError = require("../utils/apiError");

//get all roles dashboard
//admin
exports.getRoleDashboard = asyncHandler(async (req,res,next)=>{

    const rolesDashboard = await RoleDashboardModel.find();
    res.status(201).json({status:"true", data:rolesDashboard});

});
