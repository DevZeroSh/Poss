const asyncHandler = require("express-async-handler");
const suppliersModel = require("../models/suppliersModel");
const ApiError = require("../utils/apiError");

//Create New Supplier
//rol:Who has rol can create
exports.createSupplier= asyncHandler(async (req,res,next)=>{
    const supplier= await suppliersModel.create(req.body);
    res.status(201).json({status:"true",message:"Supplier Inserted", data:supplier});
});

//Get All Suppliers
//@rol: who has rol can Get Suppliers Data
exports.getSuppliers = asyncHandler(async (req,res,next)=>{
    const supplier = await suppliersModel.find();
    res.status(200).json({status:"true",data:supplier});
});


//Get One Supplier
//@rol: who has rol can Get the Supplier's Data
exports.getSupplier = asyncHandler(async(req,res,next)=>{

    const {id} = req.params;
    const supplier = await suppliersModel.findById(id);

    if(!supplier){
        return next(new ApiError(`There is no supplier with this id ${id}`,404));
    }else{
        res.status(200).json({status:"true", data: supplier });
    }

});

//Update one Supplier
//@rol: who has rol can update the Supplier's Data
exports.updataSupplier = asyncHandler(async (req,res,next)=>{

    const {id} = req.params;

    const supplier = await suppliersModel.findByIdAndUpdate(id,req.body,{new:true});
    if(!supplier){
        return next(new ApiError(`There is no supplier with this id ${id}`,404));
    }else{
        res.status(200).json({status:"true",message:"Supplier updated", data: supplier });

    }
});


//Delete One Supplier
//@rol:who has rol can Delete the Supplier
exports.deleteSupplier = asyncHandler(async (req,res,next)=>{

    const {id}     = req.params;
    const supplier = await suppliersModel.findByIdAndDelete(id);

    if (!supplier) {
        return next(new ApiError(`There is no supplier with this id ${id}`, 404));
    } else {
        res.status(200).json({ status: "true", message: "Supplier Deleted" });
    }

});