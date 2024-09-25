const asyncHandler = require("express-async-handler");
const E_user_Schema = require("../../models/ecommerce/E_user_Modal");
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
  try {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const UserModel = db.model("Users", E_user_Schema);
    const productModel = db.model("Product", productSchema);

    const product = await productModel.findById(req.body.productId);
    if (!product) {
      return res.status(404).json({
        status: "fail",
        message: "Product not found.",
      });
    }

    product.addToFavourites = (product.addToFavourites || 0) + 1;
    await product.save();

    const user = await UserModel.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { wishlist: req.body.productId } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found.",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Product added successfully to your wishlist.",
      data: user.wishlist,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Remove product from wishlist
// @route   DELETE /api/wishlist/:productId
// @access  Protected/User
exports.removeProductFromWishlist = asyncHandler(async (req, res, next) => {
  try {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const UserModel = db.model("Users", E_user_Schema);
    const productModel = db.model("Product", productSchema);

    const product = await productModel.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({
        status: "fail",
        message: "Product not found.",
      });
    }

    // Decrease the addToFavourites field by one
    product.addToFavourites = Math.max((product.addToFavourites || 0) - 1, 0);
    await product.save();

    const user = await UserModel.findByIdAndUpdate(
      req.user._id,
      {
        $pull: { wishlist: req.params.productId },
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found.",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Product removed successfully from your wishlist.",
      data: user.wishlist,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get logged user wishlist
// @route   GET /api/wishlist
// @access  Protected/User
exports.getLoggedUserWishlist = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const UserModel = db.model("Users", E_user_Schema);
  db.model("Product", productSchema);
  db.model("Category", categorySchema);
  db.model("brand", brandSchema);
  db.model("Labels", labelsSchema);
  db.model("Tax", TaxSchema);
  db.model("Unit", UnitSchema);
  db.model("Variant", variantSchema);
  const CurrencyModel = db.model("Currency", currencySchema);

  const user = await UserModel.findById(req.user._id).populate({
    path: "wishlist", 
    populate: {
      path: "currency",
      model: CurrencyModel, 
    },
  });

  res.status(200).json({
    status: "success",
    results: user.wishlist.length,
    data: user.wishlist,
  });
});
