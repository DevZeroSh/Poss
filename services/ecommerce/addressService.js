const asyncHandler = require("express-async-handler");

// @desc    Add address to user addresses list
// @route   POST /api/addresses

const { default: mongoose } = require("mongoose");
const customarSchema = require("../../models/customarModel");

// @access  Protected/User
exports.addAddress = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const customerModel = db.model("customar", customarSchema);
  // $addToSet => add address object to user addresses  array if address not exist
  const user = await customerModel.findByIdAndUpdate(
    req.user._id,
    {
      $addToSet: { addresses: req.body },
    },
    { new: true }
  );

  res.status(200).json({
    status: "success",
    message: "Address added successfully.",
    data: user.addresses,
  });
});

// @desc    Remove address from user addresses list
// @route   DELETE /api/addresses/:addressId
// @access  Protected/User
exports.removeAddress = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const customerModel = db.model("customar", customarSchema);
  // $pull => remove address object from user addresses array if addressId exist
  const user = await customerModel.findByIdAndUpdate(
    req.user._id,
    {
      $pull: { addresses: { _id: req.params.addressId } },
    },
    { new: true }
  );

  res.status(200).json({
    status: "success",
    message: "Address removed successfully.",
    data: user.addresses,
  });
});

// @desc    Get logged user addresses list
// @route   GET /api/addresses
// @access  Protected/User
exports.getLoggedUserAddresses = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const customerModel = db.model("customar", customarSchema);
  const user = await customerModel.findById(req.user._id).populate("addresses");

  res.status(200).json({
    status: "success",
    results: user.addresses.length,
    data: user.addresses,
  });
});

// @desc    Update address in user addresses list
// @route   PUT /api/addresses/:addressId
// @access  Protected/User
exports.updateAddress = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const customerModel = db.model("customar", customarSchema);

  const user = await customerModel.findOneAndUpdate(
    { _id: req.user._id, "addresses._id": req.params.addressId },
    {
      $set: { "addresses.$": req.body },
    },
    { new: true }
  );

  if (!user) {
    return res.status(404).json({
      status: "fail",
      message: "Address not found",
    });
  }

  res.status(200).json({
    status: "success",
    message: "Address updated successfully.",
    data: user.addresses,
  });
});

// @desc    Get one address by ID
// @route   GET /api/addresses/:addressId
// @access  Protected/User
exports.getAddressById = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const customerModel = db.model("customar", customarSchema);

  const user = await customerModel.findOne(
    { _id: req.user._id, "addresses._id": req.params.addressId },
    { "addresses.$": 1 }
  );

  if (!user || !user.addresses.length) {
    return res.status(404).json({
      status: "fail",
      message: "Address not found",
    });
  }

  res.status(200).json({
    status: "success",
    data: user.addresses[0],
  });
});
