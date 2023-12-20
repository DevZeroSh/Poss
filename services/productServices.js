const asyncHandler = require("express-async-handler");
const productModel = require("../models/productModel");
const slugify = require("slugify");
const multer = require("multer");
const ApiError = require("../utils/apiError");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const multerStorage = multer.memoryStorage();
const csvtojson = require("csvtojson");
const xlsx = require("xlsx");
const fs = require("fs");
const categoryModel = require("../models/CategoryModel");
const brandModel = require("../models/brandModel");
const labelsModel = require("../models/labelsModel");
const unitModel = require("../models/UnitsModel");
const taxModel = require("../models/taxModel");
const valiantModel = require("../models/variantsModel");
const path = require("path");

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
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
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
  // Search for product or qr
  let mongooseQuery = productModel.find({});

  if (req.query.keyword) {
    const query = {
      $or: [
        { name: { $regex: req.query.keyword, $options: "i" } },
        { qr: { $regex: req.query.keyword, $options: "i" } },
      ],
    };
    mongooseQuery = mongooseQuery.find(query);
  }

  // Show the all proporty
  const product = await mongooseQuery
    .populate({ path: "category", select: "name -_id" })
    .populate({ path: "brand", select: "name _id" })
    .populate({ path: "variant", select: "variant  _id" })
    .populate({ path: "unit", select: "name code  _id" })
    .populate({ path: "tax", select: "tax  _id" })
    .populate({ path: "label", select: "name  _id" })
    .populate({
      path: "currency",
      select: "currencyCode currencyName exchangeRate is_primary  _id",
    })
    .exec();

  const notices = [];

  product.forEach((element) => {
    if (element.alarm >= element.quantity) {
      if (element.archives !== "true")
        notices.push(` ${element.qr} is low on stock.`);
    }
  });
  res
    .status(200)
    .json({ status: "true", results: product.length, data: product, notices });
});

// @desc Create  product
// @route Post /api/product
// @access Private
exports.createProduct = asyncHandler(async (req, res, next) => {
  req.body.slug = slugify(req.body.name);

  const product = await productModel.create(req.body);
  res
    .status(201)
    .json({ status: "true", message: "Product Inserted", data: product });
});

// @desc Get specific product by id
// @route Get /api/product/:id
// @access Private
exports.getOneProduct = asyncHandler(async (req, res, next) => {
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
  const { id } = req.params;
  if (req.body.name) {
    req.body.slug = slugify(req.body.name);
  }
  const product = await productModel.findByIdAndUpdate({ _id: id }, req.body, {
    new: true,
  });
  if (!product) {
    return next(new ApiError(`No Product for this id ${req.params.id}`, 404));
  }
  res
    .status(200)
    .json({ status: "true", message: "Product updated", data: product });
});

// @desc Delete specific product
// @route Delete /api/product/:id
// @access Private
exports.deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await productModel.findByIdAndUpdate(
    id,
    { archives: "true" },
    { new: true }
  );
  if (!product) {
    return next(new ApiError(`No Product for this id ${req.params.id}`, 404));
  }
  res.status(200).json({ status: "true", message: "Product Deleted" });
});

// @desc import Exsel product
// @route add /api/add
// @access Private

exports.addProduct = asyncHandler(async (req, res) => {
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

    // Process your data and save to MongoDB using your mongoose model
    await productModel.insertMany(csvData);

    res.json({ success: "Success" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// @desc Export Exsel Data
// @route export /api/export
// @access Private

const exportData = (
  categories,
  columnNames,
  brands,
  label,
  unit,
  tax,
  valiant,
  fileName,
  downloadLocation
) => {
  const outputDirectory = path.resolve(downloadLocation);
  const outputFile = path.resolve(outputDirectory, `${fileName}.xlsx`);

  // Create the directory if it doesn't exist
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory);
  }

  const workBook = xlsx.utils.book_new();

  const productWorksheet = xlsx.utils.aoa_to_sheet([columnNames]);
  xlsx.utils.book_append_sheet(workBook, productWorksheet, "Products");

  // Combine category, brand, and label data into a single column
  const combinedData = [
    [
      "Category Id",
      "Category Name",
      "Brand",
      "Label",
      "Units",
      "tax",
      "valiant",
      "value",
    ],
  ];

  const maxLength = Math.max(
    categories.length,
    brands.length,
    label.length,
    unit.length,
    tax.length,
    valiant.length
  );

  for (let i = 0; i < maxLength; i++) {
    combinedData.push([
      String(categories[i]?._id || ""),
      categories[i]?.name || "",
      brands[i]?.name || "",
      label[i]?.name || "",
      unit[i]?.name || "",
      String(tax[i]?.tax + "%" || ""),
      valiant[i]?.variant || "",
      String(valiant[i]?.value || ""),
    ]);
  }

  // Create worksheet for combined data
  const combinedWorksheet = xlsx.utils.aoa_to_sheet(combinedData);
  xlsx.utils.book_append_sheet(workBook, combinedWorksheet, "CombinedData");

  xlsx.writeFile(workBook, outputFile);

  return outputFile; // Return the file path
};

exports.exportData = async (req, res) => {
  try {
    // Fetch category data from MongoDB
    const categories = await categoryModel.find({}, { __v: 0 }).lean().exec();
    const brands = await brandModel.find({}, { __v: 0 }).lean().exec();
    const label = await labelsModel.find({}, { __v: 0 }).lean().exec();
    const unit = await unitModel.find({}, { __v: 0 }).lean().exec();
    const tax = await taxModel.find({}, { __v: 0 }).lean().exec();
    const valiant = await valiantModel
      .find({}, { _id: 0, __v: 0 })
      .lean()
      .exec();

    // Column names for the export file
    const columnNames = [
      "Name",
      "slug",
      "type",
      "description",
      "sold",
      "serialNumber",
      "quantity",
      "buyingprice",
      "price",
      "qr",
      "sku",
      "image",
      "brand",
      "category",
      "variant",
      "value",
      "variant2",
      "value2",
      "unit",
      "alarm",
      "tax",
      "label",
      "taxPrice",
      "archives",
      "serialNumberType",
      "currency",
    ];

    // Choose a suitable file name
    const fileName = "combined-export";
    const { downloadLocation } = req.body;
    // Call the export function directly
    const filePath = exportData(
      categories,
      columnNames,
      brands,
      label,
      unit,
      tax,
      valiant,
      fileName,
      downloadLocation
    );

    res.status(200).json({ status: "success", filePath });
  } catch (error) {
    console.error("Error exporting data:", error);
    res.status(500).json({ status: "error", error });
  }
};

// @desc Export Exsel product
// @route export /api/export
// @access Private

const exportProduct = (
  data,
  workSheetColumnNames,
  downloadLocation,
  fileName
) => {
  const xlsx = require("xlsx");
  const path = require("path");

  const outputDirectory = path.resolve(downloadLocation);
  const outputFile = path.resolve(outputDirectory, `${fileName}.xlsx`);

  // Create the directory if it doesn't exist
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory);
  }

  const workBook = xlsx.utils.book_new();
  const workSheetData = [workSheetColumnNames, ...data];
  const workSheet = xlsx.utils.aoa_to_sheet(workSheetData);
  xlsx.utils.book_append_sheet(workBook, workSheet, "products");

  // Write the file to the specified path
  xlsx.writeFile(workBook, outputFile);
};

exports.exportProductData = async (req, res) => {
  try {
    // Fetch product data from MongoDB
    const products = await productModel
      .find({}, { _id: 0, __v: 0 })
      .populate("category brand variant unit tax label currency")
      .lean()
      .exec();

    // Structure product data for export
    const productData = products.map((product) => [
      product.name,
      product.slug,
      product.type,
      product.description,
      product.sold,
      product.serialNumber,
      product.quantity,
      product.buyingprice,
      product.price,
      product.qr,
      product.sku,
      product.image,
      product.brand ? product.brand.name : "",
      product.category ? product.category.name : "",
      product.variant ? product.variant.variant : "",
      product.value,
      product.variant2,
      product.value2,
      product.unit ? product.unit.name : "",
      product.alarm,
      product.tax ? product.tax.tax : "",
      product.label ? product.label.name : "lol",
      product.taxPrice,
      product.archives,
      product.serialNumberType,
      product.currency ? product.currency.name : "",
    ]);

    // Column names for the export file
    const columnNames = [
      "Name",
      "slug",
      "type",
      "description",
      "sold",
      "serialNumber",
      "quantity",
      "buyingprice",
      "price",
      "qr",
      "sku",
      "image",
      "brand",
      "category",
      "variant",
      "value",
      "variant2",
      "value2",
      "unit",
      "alarm",
      "tax",
      "label",
      "taxPrice",
      "archives",
      "serialNumberType",
      "currency",
    ];
    // Choose a suitable file name
    const fileName = "products-export";
    const { downloadLocation } = req.body;

    // Call the export function directly
    exportProduct(productData, columnNames, downloadLocation, fileName);

    res.status(200).json({ status: "success", message: "Export successful" });
  } catch (error) {
    console.error("Error exporting product data:", error);
    res.status(500).json({ status: "error", error });
  }
};
