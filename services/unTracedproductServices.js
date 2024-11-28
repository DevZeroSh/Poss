const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const mongoose = require("mongoose");
const UnTracedproductLogSchema = require("../models/unTracedproductLogModel");
const { Search } = require("../utils/search");

//@desc Get list of UnTracedproductLog
// @rout Get /api/untracedproductlog
// @access priveta
exports.getUnTracedproductLog = asyncHandler(async (req, res) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const UnTracedproductLogModel = db.model(
    "unTracedproductLog",
    UnTracedproductLogSchema
  );
  const { totalPages, mongooseQuery } = await Search(
    UnTracedproductLogModel,
    req
  );

  const unTracedproduct = await mongooseQuery;

  res.status(200).json({
    status: "true",
    totalPages: totalPages,
    results: unTracedproduct.length,
    data: unTracedproduct,
  });
});

//@desc Create specific UnTracedproductLog
// @rout Post /api/untracedproductlog
// @access priveta
exports.createUnTracedproductLog = asyncHandler(async (req, res) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const UnTracedproductLogModel = db.model(
    "unTracedproductLog",
    UnTracedproductLogSchema
  );

  const UnTracedproductLog = await UnTracedproductLogModel.create(req.body);
  res.status(201).json({
    status: "true",
    message: "UnTracedproductLog Inserted",
    data: UnTracedproductLog,
  });
});

//@desc get specific UnTracedproductLog by id
// @rout Get /api/untracedproductlog/:id
// @access priveta
exports.getOneUnTracedproductLog = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const UnTracedproductLogModel = db.model(
    "unTracedproductLog",
    UnTracedproductLogSchema
  );

  const { id } = req.params;
  const UnTracedproductLog = await UnTracedproductLogModel.findById(id);
  if (!UnTracedproductLog) {
    return next(new ApiError(`No UnTracedproductLog by this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", data: UnTracedproductLog });
});

exports.updataUnTracedproductLog = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const UnTracedproductLogModel = db.model(
    "unTracedproductLog",
    UnTracedproductLogSchema
  );

  const UnTracedproductLog = await UnTracedproductLogModel.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
    }
  );
  if (!UnTracedproductLog) {
    return next(
      new ApiError(`No UnTracedproductLog for this id ${req.params.id}`, 404)
    );
  }
  res.status(200).json({
    status: "true",
    message: "UnTracedproductLog updated",
    data: UnTracedproductLog,
  });
});

//@desc Delete specific UnTracedproductLog
// @rout Delete /api/untracedproductlog/:id
// @access priveta
exports.deleteUnTracedproductLog = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const UnTracedproductLogModel = db.model(
    "unTracedproductLog",
    UnTracedproductLogSchema
  );

  const { id } = req.params;
  const UnTracedproductLog = await UnTracedproductLogModel.findByIdAndDelete(
    id
  );

  if (!UnTracedproductLog) {
    return next(new ApiError(`No UnTracedproductLog by this id ${id}`, 404));
  }

  res
    .status(200)
    .json({ status: "true", message: "UnTracedproductLog Deleted" });
});
