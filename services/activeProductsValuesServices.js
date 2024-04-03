const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const activeProductsValue = require("../models/activeProductsValueModel");
const productSchema = require("../models/productModel");
const brandSchema = require("../models/brandModel");
const categorySchema = require("../models/CategoryModel");
const labelsSchema = require("../models/labelsModel");
const variantSchema = require("../models/variantsModel");
const UnitSchema = require("../models/UnitsModel");
const TaxSchema = require("../models/taxModel");
const currencySchema = require("../models/currencyModel");

// Get all active products values
exports.getAllActiveProductsValues = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const activeProducts = db.model("ActiveProductsValue", activeProductsValue);

  db.model("Product", productSchema);
  db.model("Category", categorySchema);
  db.model("brand", brandSchema);
  db.model("Labels", labelsSchema);
  db.model("Tax", TaxSchema);
  db.model("Unit", UnitSchema);
  db.model("Variant", variantSchema);
  db.model("Currency", currencySchema);

  try {
    const productsValues = await activeProducts.find();
    res.status(200).json({ status: "true", data: productsValues });
  } catch (error) {
    res.status(500).json({ error: `Error getting active products values: ${error.message}` });
  }
});
