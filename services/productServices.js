const asyncHandler = require("express-async-handler");
const productModel = require("../models/productModel");
const slugify = require("slugify");
const multer = require("multer");
const ApiError = require("../utils/apiError");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");

const multerStorage = multer.memoryStorage();

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
    .exec();

  res
    .status(200)
    .json({ status: "true", results: product.length, data: product });
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
    .populate({ path: "variant", select: "name _id" })
    .populate({ path: "tax", select: "tax  _id" });
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
