const asyncHandler = require("express-async-handler");
const PaymentTypes = require("../models/paymentTypesModel");
const ApiError = require("../utils/apiError");

//@desc Get list of payment types
// @rout Get /api/paymenttype
// @access priveta
exports.getPaymentTypes = asyncHandler(async (req, res) => {
    const paymentType = await PaymentTypes.find({});
    res.status(200).json({ status: "true", data: paymentType });
  });
  