const asyncHandler = require("express-async-handler");
const customarSchema = require("../../models/customarModel");
const { default: mongoose } = require("mongoose");
const productSchema = require("../../models/productModel");
const categorySchema = require("../../models/CategoryModel");
const brandSchema = require("../../models/brandModel");
const labelsSchema = require("../../models/labelsModel");
const TaxSchema = require("../../models/taxModel");
const UnitSchema = require("../../models/UnitsModel");
const variantSchema = require("../../models/variantsModel");
const currencySchema = require("../../models/currencyModel");

// @desc    Add product to wishlist
// @route   POST /api/wishlist
// @access  Protected/User
exports.addProductToWishlist = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const customersModel = db.model("Customar", customarSchema);
  const user = await customersModel.findByIdAndUpdate(
    req.user._id,
    { $addToSet: { wishlist: req.body.productId } },
    { new: true }
  );

  res.status(200).json({
    status: "success",
    message: "Product added successfully to your wishlist.",
    data: user.wishlist,
  });
});

// @desc    Remove product from wishlist
// @route   DELETE /api/wishlist/:productId
// @access  Protected/User
exports.removeProductFromWishlist = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const customersModel = db.model("Customar", customarSchema);
  // $pull => remove productId from wishlist array if productId exist
  const user = await customersModel.findByIdAndUpdate(
    req.user._id,
    {
      $pull: { wishlist: req.params.productId },
    },
    { new: true }
  );

  res.status(200).json({
    status: "success",
    message: "Product removed successfully from your wishlist.",
    data: user.wishlist,
  });
});

// @desc    Get logged user wishlist
// @route   GET /api/wishlist
// @access  Protected/User
exports.getLoggedUserWishlist = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const customersModel = db.model("Customar", customarSchema);
  db.model("Product", productSchema);
  db.model("Category", categorySchema);
  db.model("brand", brandSchema);
  db.model("Labels", labelsSchema);
  db.model("Tax", TaxSchema);
  db.model("Unit", UnitSchema);
  db.model("Variant", variantSchema);
  db.model("Currency", currencySchema);

  const user = await customersModel.findById(req.user._id).populate("wishlist");

  res.status(200).json({
    status: "success",
    results: user.wishlist.length,
    data: user.wishlist,
  });
});
