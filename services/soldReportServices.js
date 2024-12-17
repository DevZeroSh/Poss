const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const soldReportSchema = require("../models/soldReportModel");

//@desc Get list sold reports
//@route GET /api/soldReports/
//@access Private
exports.getSoldReports = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const soldReportModel = db.model("SoldReport", soldReportSchema);

  const soldReports = await soldReportModel.find().limit(10);

  res.status(200).json({ status: "true", data: soldReports });
});
