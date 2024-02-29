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
        const movements = await productMovement.find().populate("productId");
        res.status(200).json({ status: "true", data: movements });
    } catch (error) {
        res.status(500).json({ error: `Error getting product movements: ${error.message}` });
    }
});

// Get product movement by ID
exports.getProductMovementByID = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);

    const productMovement = db.model("ProductMovement", ProductMovement);
    try {
        let movements;
        if (id) {
            movements = await productMovement.find({ productId: id });
        } else {
            movements = [];
        }
        res.status(200).json({ status: "true", data: movements });
        next();
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ status: "false", data: error });
    }
});
