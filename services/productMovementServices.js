const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ProductMovement = require("../models/productMovementModel");
const productSchema = require("../models/productModel");
const brandSchema = require("../models/brandModel");
const categorySchema = require("../models/CategoryModel");
const labelsSchema = require("../models/labelsModel");
const variantSchema = require("../models/variantsModel");
const UnitSchema = require("../models/UnitsModel");
const TaxSchema = require("../models/taxModel");
const currencySchema = require("../models/currencyModel");

// Get all products movement
exports.getAllProductsMovements = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const productMovement = db.model("ProductMovement", ProductMovement);

  db.model("Product", productSchema);
  db.model("Category", categorySchema);
  db.model("brand", brandSchema);
  db.model("Labels", labelsSchema);
  db.model("Tax", TaxSchema);
  db.model("Unit", UnitSchema);
  db.model("Variant", variantSchema);
  db.model("Currency", currencySchema);

  try {
    const movements = await productMovement.find().populate("productId").lean();
    res.status(200).json({ status: "true", data: movements });
  } catch (error) {
    res
      .status(500)
      .json({ error: `Error getting product movements: ${error.message}` });
  }
});

// Get product movement by ID
exports.getProductMovementByID = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const pageSize = req.query.limit || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  const productMovement = db.model("ProductMovement", ProductMovement);

  const query = { productId: id };
  const totalItems = await productMovement.countDocuments(query);
  const totalPages = Math.ceil(totalItems / pageSize);
  if (req.query.movementType) {
    query.movementType = req.query.movementType;
  }
  if (req.query.source) {
    query.source = { $regex: req.query.source, $options: "i" };
  }
  if (req.query.startDate && req.query.endDate) {
    const startDate = new Date(req.query.startDate);
    const endDate = new Date(req.query.endDate);

    if (!isNaN(startDate) && !isNaN(endDate)) {
      query.createdAt = {
        $gte: startDate,
        $lte: endDate,
      };
    } else {
      return res
        .status(400)
        .json({ status: "false", message: "Invalid date range" });
    }
  }

  let movements = [];
  if (id) {
    movements = await productMovement
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);
  }

  res.status(200).json({
    status: "true",
    Pages: totalPages,
    results: movements.length,
    data: movements,
  });
});
