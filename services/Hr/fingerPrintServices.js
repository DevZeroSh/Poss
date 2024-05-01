const asyncHandler = require("express-async-handler");
const fingerPrintSchema = require("../../models/Hr/fingerprintModel");
const mongoose = require("mongoose");
const ApiError = require("../../utils/apiError");

//@desc Get list of finger-print
//@route GEt /api/finger-print
//@accsess public just for Admine
exports.getFingerPrint = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const fingerPrintModel = db.model("FingerPrint", fingerPrintSchema);

  const pageSize = 20;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  let mongooseQuery = fingerPrintModel.find();

  if (req.query.keyword) {
    const query = {
      $and: [
        {
          $or: [
            {
              name: {
                $regex: req.query.keyword,
                $options: "i",
              },
            },
          ],
        },
      ],
    };
    mongooseQuery = mongooseQuery.find(query);
  }
  mongooseQuery = mongooseQuery.sort({ createdAt: -1 });
  const totalItems = await fingerPrintModel.countDocuments();

  const totalPages = Math.ceil(totalItems / pageSize);

  mongooseQuery = mongooseQuery.skip(skip).limit(pageSize);
  const fingerPrint = await mongooseQuery;

  res.status(200).json({
    status: "true",
    Pages: totalPages,
    results: fingerPrint.length,
    data: fingerPrint,
  });
});

exports.getLoggedUserFingerPrint = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const fingerPrintModel = db.model("FingerPrint", fingerPrintSchema);

  const fingerPrint = await fingerPrintModel.find({ userID: req.user.id });
  if (!fingerPrint) {
    return next(
      new ApiError(`No fingerPrint found for id ${req.user.id}`, 404)
    );
  }
  res
    .status(200)
    .json({ status: "true", results: fingerPrint.length, data: fingerPrint });
});
//@desc Get list of finger-print
//@route GEt /api/finger-print/:id
//@accsess public just for Admine
exports.getOneFingerPrint = asyncHandler(async (req, res) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const fingerPrintModel = db.model("FingerPrint", fingerPrintSchema);
  const fingerPrint = await fingerPrintModel.findById(req.params.id);
  res
    .status(200)
    .json({ status: "true", results: fingerPrint.length, data: fingerPrint });
});
//@desc Post Make the finger print for enter and exit
//@route Post /api/finger-print
//@accsess public just for Employee

exports.createFingerPrint = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const fingerprintModel = db.model("FingerPrint", fingerPrintSchema);

  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }

  let ts = Date.now();
  let date_ob = new Date(ts);
  let date = padZero(date_ob.getDate());
  let month = padZero(date_ob.getMonth() + 1);
  let year = date_ob.getFullYear();
  let hours = padZero(date_ob.getHours());
  let minutes = padZero(date_ob.getMinutes());
  let seconds = padZero(date_ob.getSeconds());

  const Dates = year + "-" + month + "-" + date;
  const Time = hours + ":" + minutes + ":" + seconds;
  req.body.date = Dates;
  req.body.Time = Time;
  req.body.userID = req.user._id;
  req.body.name = req.user.name;
  req.body.email = req.user.email;

  const fingerPrint = await fingerprintModel.create(req.body);
  res.status(200).json({
    status: "success",
    results: fingerPrint.length,
    data: fingerPrint,
  });
});

//@desc Delete Delete the finger print
//@route Delete /api/finger-print
//@accsess public just for Admin
exports.deleteFingerprint = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const fingerPrintModel = db.model("FingerPrint", fingerPrintSchema);
  const fingerPrint = await fingerPrintModel.findByIdAndDelete(req.params.id);
  if (!fingerPrint) {
    return next(
      new ApiError(`No fingerPrint by this id ${req.params.id}`, 404)
    );
  }
  res.status(200).json({ status: "true", meesage: "Deleted" });
});

//@desc Update Update the finger print
//@route Update /api/finger-print
//@accsess public just for Admin
exports.updateFingerPrint = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const fingerPrintModel = db.model("FingerPrint", fingerPrintSchema);
  const fingerPrint = await fingerPrintModel.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
    }
  );
  if (!fingerPrint) {
    return next(
      new ApiError(`No fingerPrint by this id ${req.params.id}`, 404)
    );
  }
  res.status(200).json({
    status: "success",
    results: fingerPrint.length,
    data: fingerPrint,
  });
});
