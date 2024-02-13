const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const customarSchema = require("../models/customarModel");
const { Search } = require("../utils/search");

//Create New Customar
//@rol: Who has rol can create
exports.createCustomar = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const customarsModel = db.model("Customar", customarSchema);

  const customar = await customarsModel.create(req.body);
  res
    .status(201)
    .json({ status: "true", message: "Customar Inserted", data: customar });
});

//Get All Customars
//@rol: who has rol can Get Customars Data
exports.getCustomars = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const customarsModel = db.model("Customar", customarSchema);
  const { totalPages, mongooseQuery } = await Search(customarsModel, req);
  const customars = await mongooseQuery;
  res.status(200).json({
    status: "true",
    totalPages: totalPages,
    results: customars.length,
    data: customars,
  });
});

//Get One Customar
//@rol: who has rol can Get the Customar's Data
exports.getCustomar = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const customarsModel = db.model("Customar", customarSchema);
  const customar = await customarsModel.findById(id);

  if (!customar) {
    return next(new ApiError(`There is no customar with this id ${id}`, 404));
  } else {
    res.status(200).json({ status: "true", data: customar });
  }
});

//Update one Customar
//@rol: who has rol can update the Customar's Data
exports.updataCustomar = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const customarsModel = db.model("Customar", customarSchema);

  const customar = await customarsModel.findByIdAndUpdate(id, req.body, {
    new: true,
  });

  if (!customar) {
    return next(new ApiError(`There is no customar with this id ${id}`, 404));
  } else {
    res
      .status(200)
      .json({ status: "true", message: "Customar updated", data: customar });
  }
});

//Delete One Customar(Put it in archives)
//@rol:who has rol can Delete the Customar
exports.deleteCustomar = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const customarsModel = db.model("Customar", customarSchema);

  const customar = await customarsModel.findByIdAndUpdate(
    id,
    { archives: "true" },
    { new: true }
  );

  if (!customar) {
    return next(new ApiError(`There is no customer with this id ${id}`, 404));
  } else {
    res.status(200).json({ status: "true", message: "Customer Deleted" });
  }
});
