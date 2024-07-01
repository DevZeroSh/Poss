const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const customarSchema = require("../models/customarModel");
const { Search } = require("../utils/search");
const bcrypt = require("bcrypt");
const createToken = require("../utils/createToken");
const { createPaymentHistory, editPaymentHistory } = require("./paymentHistoryService");
//Create New Customar
//@rol: Who has rol can create
exports.createCustomar = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const customersModel = db.model("Customar", customarSchema);
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

  const formattedDate =
    year +
    "-" +
    month +
    "-" +
    date +
    " " +
    hours +
    ":" +
    minutes +
    ":" +
    seconds;
  const nextCounter = (await customersModel.countDocuments()) + 1;
  if (
    req.body.email === null ||
    req.body.email === undefined ||
    req.body.email === ""
  ) {
    req.body.email = `email@email.email${nextCounter}`;
  }
  req.body.openingBalance = req.body.TotalUnpaid;
  const customar = await customersModel.create(req.body);

  const openingBalance = await createPaymentHistory(
    "Opening balance",
    req.body.date || formattedDate,
    req.body.TotalUnpaid,
    customar.TotalUnpaid,
    "customer",
    customar.id,
    "",
    dbName
  );
  customar.openingBalanceId = openingBalance._id;
  await customar.save();
  res
    .status(201)
    .json({ status: "true", message: "Customar Inserted", data: customar });
});

//Get All Customars
//@rol: who has rol can Get Customars Data
exports.getCustomars = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const customersModel = db.model("Customar", customarSchema);
  const { totalPages, mongooseQuery } = await Search(customersModel, req);
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
  const customersModel = db.model("Customar", customarSchema);
  const customar = await customersModel.findById(id);

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
  const customersModel = db.model("Customar", customarSchema);

  const customar = await customersModel.findById(id);


  if (!customar) {
    return next(new ApiError(`There is no customar with this id ${id}`, 404));
  } else {

    await editPaymentHistory(
      dbName,
      customar.openingBalanceId,
      req.body.openingBalance,
    )
    req.body.TotalUnpaid = parseFloat(customar.TotalUnpaid) + parseFloat(req.body.openingBalance) - parseFloat(req.body.openingBalanceBefor);
    req.body.total = parseFloat(customar.total) + parseFloat(req.body.openingBalance) - parseFloat(req.body.openingBalanceBefor);
    const updatedCustomar = await customersModel.findByIdAndUpdate(id, req.body, {
      new: true,
    });


    res
      .status(200)
      .json({ status: "true", message: "Customar updated", data: updatedCustomar });
  }
});

exports.updateCustomerPassword = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const customersModel = db.model("Customar", customarSchema);

  // Update user password based on user payload (req.user._id)
  const user = await customersModel.findByIdAndUpdate(
    req.user._id,
    {
      password: await bcrypt.hash(req.body.newPassword, 12),
      passwordChangedAt: Date.now(),
    },
    {
      new: true,
    }
  );

  if (!user) {
    return new ApiError("User not found", 404);
  }

  // Generate Token
  const token = createToken(user._id);

  res.status(200).json({ data: user, token });
});

//Delete One Customar(Put it in archives)
//@rol:who has rol can Delete the Customar
exports.deleteCustomar = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const customersModel = db.model("Customar", customarSchema);

  const customar = await customersModel.findByIdAndUpdate(
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
