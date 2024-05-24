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
const { createActiveProductsValue } = require("../utils/activeProductsValue");
const ProductMovementSchema = require("../models/productMovementModel");
const ActiveProductsValueModel = require("../models/activeProductsValueModel");
const reviewSchema = require("../models/ecommerce/reviewModel");
const customarSchema = require("../models/customarModel");

const multerOptions = () => {
  const multerStorage = multer.memoryStorage();

  const multerFilter = function (req, file, cb) {
    if (file.mimetype.startsWith("image")) {
      cb(null, true);
    } else {
      cb(new ApiError("Only images Allowed", 400), false);
    }
  };

  const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

  return upload;
};

const uploadMixOfImages = (arrayOfFilelds) =>
  multerOptions().fields(arrayOfFilelds);

exports.uploadProductImage = uploadMixOfImages([
  { name: "image", maxCount: 1 },
  { name: "imagesArray", maxCount: 5 },
]);

exports.resizerImage = asyncHandler(async (req, res, next) => {
  if (req.files.image) {
    const imageCoverFilename = `product-${uuidv4()}-${Date.now()}-cover.png`;
    await sharp(req.files.image[0].buffer)
      .toFormat("png")
      .png({ quality: 70 })
      .toFile(`uploads/product/${imageCoverFilename}`);

    //save image into our db
    req.body.image = imageCoverFilename;
  }
  //-2 Images
  if (req.files.imagesArray) {
    req.body.imagesArray = [];
    await Promise.all(
      req.files.imagesArray.map(async (img, index) => {
        const imagesName = `product-${uuidv4()}-${Date.now()}-${index + 1}.png`;
        await sharp(img.buffer)
          .resize(900, 400)
          .toFormat("png")
          .png({ quality: 70 })
          .toFile(`uploads/product/${imagesName}`);

        //save image into our db
        req.body.imagesArray.push(imagesName);
      })
    );
  }
  next();
});

// @desc Get list product
// @route Get /api/product
// @access Public
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
  db.model("Review", reviewSchema);
  db.model("Customar", customarSchema);
  const pageSize = req.query.limit || 25;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  let query = {};

  if (req.query.keyword) {
    query.$or = [
      { name: { $regex: req.query.keyword, $options: "i" } },
      { qr: { $regex: req.query.keyword, $options: "i" } },
    ];
  }

  if (req.query.type === "category" || req.query.type === "brand") {
    query.$and = [];
    if (req.query.type === "category") {
      query.$and.push({ category: req.query.id });
    }
    if (req.query.type === "brand") {
      query.$and.push({ brand: req.query.id });
    }
  }

  if (req.query.label) {
    query.label = req.query.label;
  }

  let sortQuery = {};
  if (req.query.sold) {
    sortQuery = { sold: parseInt(req.query.sold) === 1 ? 1 : -1 };
  } else {
    sortQuery = { createdAt: -1 };
  }

  const totalItems = await productModel.countDocuments(query);

  const totalPages = Math.ceil(totalItems / pageSize);

  const product = await productModel
    .find(query)
    .sort(sortQuery)
    .skip(skip)
    .limit(pageSize);

  const notices = product
    .filter((item) => item.alarm >= item.quantity && item.archives !== "true")
    .map((item) => ({
      qr: item.qr,
      name: item.name,
      id: item._id,
      message: `${item.qr} is low on stock.`,
    }));

  res.status(200).json({
    status: "true",
    results: product.length,
    Pages: totalPages,
    data: product,
    notices,
  });
});



//
exports.getLezyProduct = asyncHandler(async (req, res, next) => {
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
  db.model("Review", reviewSchema);
  db.model("Customar", customarSchema);

  let limit = req.query.limit
  let skip = req.query.skip

  const product = await productModel.find().skip(parseInt(skip))
    .limit(parseInt(limit))
  res.status(200).json({
    status: "true",
    results: product.length,
    data: product,

  });
});
// @desc Create  product
// @route Post /api/product
// @access Private
exports.createProduct = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const productModel = db.model("Product", productSchema);
  const currencyModel = db.model("Currency", currencySchema);

  try {
    req.body.slug = slugify(req.body.name);
    const product = await productModel.create(req.body);
    const currency = await currencyModel.findById(product.currency);
    const productValue = product.activeCount * product.buyingprice;
    createActiveProductsValue(
      product.activeCount,
      productValue,
      currency._id,
      dbName
    )
      .then((savedData) => { })
      .catch((error) => {
        console.log(error);
      });
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

  const movementsModel = db.model("ProductMovements", ProductMovementSchema);
  const productModel = db.model("Product", productSchema);
  db.model("Category", categorySchema);
  db.model("brand", brandSchema);
  db.model("Labels", labelsSchema);
  db.model("Tax", TaxSchema);
  db.model("Unit", UnitSchema);
  db.model("Variant", variantSchema);
  db.model("Currency", currencySchema);
  db.model("Review", reviewSchema);
  db.model("Customar", customarSchema);
  const { id } = req.params;
  let query = productModel.findById(id).populate({ path: "reviews" });

  const product = await query;

  const movements = await movementsModel.find({ productId: id });
  res.status(200).json({ data: product, movements: movements });
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
    const existingProduct = await productModel.findById({ _id: id });
    if (!existingProduct) {
      return next(new ApiError(`No Product for this id ${req.params.id}`, 404));
    }

    const quantityChanged = existingProduct.quantity != req.body.quantity;

    const product = await productModel.findByIdAndUpdate(
      { _id: id },
      req.body,
      {
        new: true,
      }
    );
    if (!product) {
      return next(new ApiError(`No Product for this id ${req.params.id}`, 404));
    }

    let savedMovement;
    if (quantityChanged) {
      savedMovement = await createProductMovement(
        id,
        req.body.quantity,
        req.body.quantity - req.body.quantityBefore,
        "edit",
        "update",
        dbName
      );
    }

    try {
      const quantityChanged = req.body.quantity !== req.body.quantityBefore;
      const priceChanged = req.body.buyingprice !== req.body.buyingpriceBefore;
      if (quantityChanged || priceChanged) {
        const ActiveProductsValue = db.model(
          "ActiveProductsValue",
          ActiveProductsValueModel
        );

        if (product.currency) {
          const existingRecord = await ActiveProductsValue.findOne({
            currency: req.body.currency,
          });

          // Calculate the total value for the new and old quantities and prices
          const newProductValue = req.body.quantity * req.body.buyingprice;
          const oldProductValue =
            req.body.quantityBefore * req.body.buyingpriceBefore;

          // The difference in product value
          const productValueDiff = newProductValue - oldProductValue;

          // Calculate the difference in quantity
          const diffQuantity = req.body.quantity - req.body.quantityBefore;

          if (existingRecord) {
            existingRecord.activeProductsCount += diffQuantity;
            existingRecord.activeProductsValue += productValueDiff;
            await existingRecord.save();
          } else {
            await createActiveProductsValue(
              req.body.quantity,
              newProductValue,
              req.body.currency,
              dbName
            );
          }
        } else {
          console.error("Currency not found 319");
        }
      }
    } catch (e) {
      console.error(e.message);
    }

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
  const ActiveProductsValue = db.model(
    "ActiveProductsValue",
    ActiveProductsValueModel
  );

  const productModel = db.model("Product", productSchema);

  const { id } = req.params;

  // Find the product by ID
  const product = await productModel.findById(id);

  if (!product) {
    return next(new ApiError(`No Product for this id ${id}`, 404));
  }
  try {
    const existingRecord = await ActiveProductsValue.findOne({
      currency: product.currency._id,
    });

    const diffValue = product.buyingprice * product.activeCount;
    product.archives = product.archives === "true" ? "false" : "true";

    // Update only the 'archives' field
    const updatedProduct = await productModel.findByIdAndUpdate(
      id,
      { $set: { archives: product.archives } },
      { new: true }
    );

    const movementType = product.archives === "true" ? "out" : "in";
    const movementDescription =
      product.archives === "true" ? "archive" : "unarchive";
    const savedMovement = await createProductMovement(
      id,
      product.quantity,
      movementType,
      movementDescription,
      dbName
    );

    if (existingRecord) {
      existingRecord.activeProductsCount -= product.activeCount;
      existingRecord.activeProductsValue -= diffValue;
      await existingRecord.save();
    } else {
      const productValue = product.activeCount * product.buyingprice;
      await createActiveProductsValue(
        product.activeCount,
        productValue,
        product.currency,
        dbName
      );
    }

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
    if (
      req.file.originalname.endsWith(".csv") ||
      req.file.mimetype === "text/csv"
    ) {
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
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
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
    return res
      .status(404)
      .json({ status: "false", message: "Product not found" });
  }

  try {
    const ActiveProductsValue = db.model(
      "ActiveProductsValue",
      ActiveProductsValueModel
    );
    const existingRecord = await ActiveProductsValue.findOne({
      currency: product.currency,
    });
    const diffValue = product.buyingprice * newQuantity;

    let type = "";
    let source = "";

    if (req.body.type === "deActive") {
      // Update the product
      await productModel.findByIdAndUpdate(id, {
        $inc: {
          deactivateCount: newQuantity,
          activeCount: -newQuantity,
        },
      });
      type = "out";
      source = "deactivate";

      if (existingRecord) {
        existingRecord.activeProductsCount -= newQuantity;
        existingRecord.activeProductsValue -= diffValue;
        await existingRecord.save();
      } else {
        const productValue = product.activeCount * product.buyingprice;
        await createActiveProductsValue(
          product.activeCount,
          productValue,
          product.currency,
          dbName
        );
      }
    } else if (req.body.type === "active") {
      await productModel.findByIdAndUpdate(id, {
        $inc: {
          deactivateCount: -newQuantity,
          activeCount: newQuantity,
        },
      });
      type = "in";
      source = "activate";

      if (existingRecord) {
        existingRecord.activeProductsCount += newQuantity;
        existingRecord.activeProductsValue += diffValue;
        await existingRecord.save();
      } else {
        await createActiveProductsValue(
          newQuantity,
          diffValue,
          product.currency,
          dbName
        );
      }
    }

    await createProductMovement(id, newQuantity, type, source, dbName);
    res.status(200).json({ status: "true", message: "Product Deactivated" });
  } catch (error) {
    return new ApiError(
      `Error activating/deactivating product: ${error.message}`,
      500
    );
  }
});
