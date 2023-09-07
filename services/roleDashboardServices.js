const asyncHandler = require("express-async-handler");
const roleDashboardModel = require("../models/roleDashboardModel");
const ApiError = require("../utils/apiError");

//get all roles dashboard
//admin
exports.getRoleDashboard = asyncHandler(async (req,res,next)=>{

    const rolesDashboard = await roleDashboardModel.find();
    res.status(201).json({status:"true", data:rolesDashboard});

});
