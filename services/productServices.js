const asyncHandler = require("express-async-handler");
const productSchema = require("../models/productModel");
const slugify = require("slugify");
const multer = require("multer");
const ApiError = require("../utils/apiError");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const multerStorage = multer.memoryStorage();
const csvtojson = require("csvtojson");
const xlsx = require("xlsx");
const { default: mongoose } = require("mongoose");
const brandSchema = require("../models/brandModel");
const categorySchema = require("../models/CategoryModel");
const labelsSchema = require("../models/labelsModel");
const variantSchema = require("../models/variantsModel");
const UnitSchema = require("../models/UnitsModel");
const TaxSchema = require("../models/taxModel");
const currencySchema = require("../models/currencyModel");
const { createProductMovement } = require("../utils/productMovement");

const multerFilter = function (req, file, cb) {
    if (file.mimetype.startsWith("image")) {
        cb(null, true);
    } else {
        cb(new ApiError("Only images Allowed", 400), false);
    }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadProductImage = upload.single("image");

exports.resizerImage = asyncHandler(async (req, res, next) => {
    const filename = `product-${uuidv4()}-${Date.now()}.jpeg`;

    if (req.file) {
        await sharp(req.file.buffer)
            .resize(600, 600)
            .toFormat("png")
            .jpeg({ quality: 70 })
            .toFile(`uploads/product/${filename}`);

        //save image into our db
        req.body.image = filename;
    }

    next();
});

// @desc Get list product
// @route Get /api/product
// @access Private
exports.getProduct = asyncHandler(async (req, res, next) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);

    const productModel = db.model("Product", productSchema);
    db.model("Category", categorySchema);
    db.model("brand", brandSchema);
    db.model("Labels", labelsSchema);
    db.model("Tax", TaxSchema);
    db.model("Unit", UnitSchema);
    db.model("Variant", variantSchema);
    db.model("Currency", currencySchema);

    const pageSize = 25;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * pageSize;

    // Search for product or qr
    let mongooseQuery = productModel.find();

    if (req.query.keyword) {
        const query = {
            $and: [
                { archives: { $ne: true } },
                {
                    $or: [
                        { name: { $regex: req.query.keyword, $options: "i" } },
                        { qr: { $regex: req.query.keyword, $options: "i" } },
                    ],
                },
            ],
        };
        mongooseQuery = mongooseQuery.find(query);
    }
    mongooseQuery = mongooseQuery.sort({ createdAt: -1 });

    // Count total items without pagination
    const totalItems = await productModel.countDocuments();

    // Calculate total pages
    const totalPages = Math.ceil(totalItems / pageSize);

    // Apply pagination
    mongooseQuery = mongooseQuery.skip(skip).limit(pageSize);

    const product = await mongooseQuery;

    const notices = [];
    const nonArchivedProductCount = product.filter((item) => item.archives !== "true").length;

    product.forEach((element) => {
        if (element.alarm >= element.quantity) {
            if (element.archives !== "true") {
                notices.push(` ${element.qr} is low on stock.`);
            }
        }
    });

    res.status(200).json({
        status: "true",
        results: nonArchivedProductCount,
        Pages: totalPages,
        data: product,
        notices,
    });
});

// @desc Create  product
// @route Post /api/product
// @access Private
exports.createProduct = asyncHandler(async (req, res, next) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const productModel = db.model("Product", productSchema);

    try {
        req.body.slug = slugify(req.body.name);
        const product = await productModel.create(req.body);

        const savedMovement = await createProductMovement(
            product._id,
            product.quantity,
            product.quantity,
            "in",
            "create",
            dbName
        );

        res.status(201).json({
            status: "true",
            message: "Product Inserted",
            data: product,
            movement: savedMovement,
        });
    } catch (error) {
        return new ApiError(`Error creating product: ${error.message}`, 500);
    }
});

// @desc Get specific product by id
// @route Get /api/product/:id
// @access Private
exports.getOneProduct = asyncHandler(async (req, res, next) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);

    const productModel = db.model("Product", productSchema);
    db.model("Category", categorySchema);
    db.model("brand", brandSchema);
    db.model("Labels", labelsSchema);
    db.model("Tax", TaxSchema);
    db.model("Unit", UnitSchema);
    db.model("Variant", variantSchema);
    db.model("Currency", currencySchema);
    const { id } = req.params;
    const product = await productModel
        .findById(id)
        .populate({ path: "category", select: "name _id" })
        .populate({ path: "brand", select: "name _id" })
        .populate({ path: "variant", select: "variant  _id" })
        .populate({ path: "unit", select: "name code  _id" })
        .populate({ path: "tax", select: "tax  _id" })
        .populate({ path: "label", select: "name  _id" })
        .populate({
            path: "currency",
            select: "currencyCode currencyName exchangeRate is_primary  _id",
        });
    res.status(200).json({ data: product });
});

// @desc Update specific product
// @route Put /api/product/:id
// @access Private
exports.updateProduct = asyncHandler(async (req, res, next) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    db.model("Category", categorySchema);
    db.model("brand", brandSchema);
    db.model("Labels", labelsSchema);
    db.model("Tax", TaxSchema);
    db.model("Unit", UnitSchema);
    db.model("Variant", variantSchema);
    db.model("Currency", currencySchema);

    const productModel = db.model("Product", productSchema);

    const { id } = req.params;
    if (req.body.name) {
        req.body.slug = slugify(req.body.name);
    }
    try {
        const product = await productModel.findByIdAndUpdate({ _id: id }, req.body, {
            new: true,
        });
        if (!product) {
            return next(new ApiError(`No Product for this id ${req.params.id}`, 404));
        }

        const savedMovement = await createProductMovement(
            id,
            req.body.quantity,
            req.body.quantity - req.body.quantityBefore,
            "edit",
            "update",
            dbName
        );

        res.status(200).json({
            status: "true",
            message: "Product updated",
            data: product,
            movement: savedMovement,
        });
    } catch (error) {
        return new ApiError(`Error updating product: ${error.message}`, 500);
    }
});

// @desc Delete specific product
// @route Delete /api/product/:id
// @access Private
exports.archiveProduct = asyncHandler(async (req, res, next) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    db.model("Category", categorySchema);
    db.model("brand", brandSchema);
    db.model("Labels", labelsSchema);
    db.model("Tax", TaxSchema);
    db.model("Unit", UnitSchema);
    db.model("Variant", variantSchema);
    db.model("Currency", currencySchema);

    const productModel = db.model("Product", productSchema);

    const { id } = req.params;

    // Find the product by ID
    const product = await productModel.findById(id);

    if (!product) {
        return next(new ApiError(`No Product for this id ${id}`, 404));
    }

    try {
        // Toggle the value of 'archives'
        product.archives = product.archives === "true" ? "false" : "true";

        // Update only the 'archives' field
        const updatedProduct = await productModel.findByIdAndUpdate(
            id,
            { $set: { archives: product.archives } },
            { new: true }
        );

        const savedMovement = await createProductMovement(
            id,
            product.quantity,
            product.archives === "true" ? "out" : "in",
            product.archives === "true" ? "archive" : "unarchive",
            dbName
        );

        res.status(200).json({
            status: "success",
            message: "Product Archived",
            data: updatedProduct,
            movement: savedMovement,
        });
    } catch (error) {
        return new ApiError(`Error archiving product: ${error.message}`, 500);
    }
});

// @desc import products from Excel
// @route add /api/add
// @access Private
exports.addProduct = asyncHandler(async (req, res) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const productModel = db.model("Product", productSchema);
    db.model("Category", categorySchema);
    db.model("brand", brandSchema);
    db.model("Labels", labelsSchema);
    const taxModel = db.model("Tax", TaxSchema);
    db.model("Unit", UnitSchema);
    db.model("Variant", variantSchema);
    db.model("Currency", currencySchema);

    try {
        const { buffer } = req.file;

        let csvData;

        // Check the file type based on the file extension or content type
        if (req.file.originalname.endsWith(".csv") || req.file.mimetype === "text/csv") {
            // Use csvtojson to convert CSV buffer to JSON array
            csvData = await csvtojson().fromString(buffer.toString());
        } else if (
            req.file.originalname.endsWith(".xlsx") ||
            req.file.mimetype ===
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ) {
            // Use xlsx library to convert XLSX buffer to JSON array
            const workbook = xlsx.read(buffer, { type: "buffer" });
            const sheet_name_list = workbook.SheetNames;
            csvData = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
        } else {
            return res.status(400).json({ error: "Unsupported file type" });
        }
        for (const item of csvData) {
            try {
                const tax = await taxModel.findById(item.tax);
                const finalPrice = item.price * (1 + tax.tax / 100);
                item.taxPrice = finalPrice;
            } catch (error) {
                // Handle errors when finding currency
                console.error(
                    `Error finding currency for item with QR ${item.qr}: ${error.message}`
                );
            }
        }
        // Process your data and save to MongoDB using your mongoose model
        const duplicateQRs = [];

        // Use try-catch to catch duplicate key errors
        try {
            await productModel.insertMany(csvData, { ordered: false });
        } catch (error) {
            if (error.code === 11000) {
                // Duplicate key error
                error.writeErrors.forEach((writeError) => {
                    const duplicateQR = writeError.err.op.qr;
                    duplicateQRs.push(duplicateQR);
                    console.log(`Duplicate QR: ${duplicateQR}`);
                });
            } else {
                throw error; // Re-throw other errors
            }
        }

        res.json({ success: "Success", duplicateQRs });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// @desc put Deactivate prodcut quantity
// @route put /api/product/deactivate
// @access Private
exports.deActiveProductQuantity = asyncHandler(async (req, res) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    db.model("Category", categorySchema);
    db.model("brand", brandSchema);
    db.model("Labels", labelsSchema);
    db.model("Tax", TaxSchema);
    db.model("Unit", UnitSchema);
    db.model("Variant", variantSchema);
    db.model("Currency", currencySchema);

    const { id } = req.params;
    const productModel = db.model("Product", productSchema);

    const { newQuantity } = req.body;
    // Find the product by ID
    const product = await productModel.findById(id);

    if (!product) {
        return res.status(404).json({ status: "false", message: "Product not found" });
    }

    try {
        let type = "";
        let source = "";
        if (req.body.type === "deActive") {
            // Update the product
            await productModel.findByIdAndUpdate(id, {
                $inc: {
                    deactivateCount: +newQuantity,
                    activeCount: -newQuantity,
                },
            });
            type = "out";
            source = "deactivate";
        } else if (req.body.type === "active") {
            await productModel.findByIdAndUpdate(id, {
                $inc: {
                    deactivateCount: -newQuantity,
                    activeCount: +newQuantity,
                },
            });
            type = "in";
            source = "activate";
        }
        await createProductMovement(id, newQuantity, type, source, dbName);
        res.status(200).json({ status: "true", message: "Product Deactivated" });
    } catch (error) {
        return new ApiError(`Error activating/deactivating product: ${error.message}`, 500);
    }
});
