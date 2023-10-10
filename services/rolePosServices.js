const asyncHandler = require("express-async-handler");
const rolePosModel = require("../models/rolePosModel");
const ApiError = require("../utils/apiError");

//get all roles dashboard
//admin
exports.getRolePos = asyncHandler(async (req,res,next)=>{

    const rolesPos = await rolePosModel.find();
    res.status(201).json({status:"true", data:rolesPos});

});

//get roles on array of ids
exports.getPosRoles = async (ids) => {
    
    const posRoles = await rolePosModel.find(
        {_id: { $in: ids }}
    ).select('-_id title');

    const titles = posRoles.map(role => role.title);

    return titles;
};
