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
      .resize(600, 600)
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toFile(`uploads/product/${filename}`);

    //save image into our db
    req.body.image = filename;
  }

  next();
});

exports.getProduct = asyncHandler(async (req, res, next) => {
  const product = await productModel
    .find({})
    .populate({ path: "category", select: "name -_id" })
    .populate({ path: "brand", select: "name -_id" })
    .populate({ path: "variant", select: "variant  -_id" });
  res.status(200).json({ results: product.length, data: product });
});

exports.createProduct = asyncHandler(async (req, res, next) => {
  const {
    name,
    description,
    sold,
    price,
    priceAftereDiscount,
    qr,
    sku,
    serialNumber,
    brand,
    category,
  } = req.body;
  const product = await productModel.create(req.body);
  res.status(201).json({ data: product });
});

exports.getOneProduct = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const product = await productModel
    .findById(id)
    .populate({ path: "category", select: "name -_id" })
    .populate({ path: "brand", select: "name -_id" })
    .populate({ path: "variant", select: "name -_id" });
  res.status(200).json({ data: product });
});

exports.updateProduct = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const {
    name,
    description,
    sold,
    price,
    priceAftereDiscount,
    qr,
    sku,
    serialNumber,
    brand,
    category,
  } = req.body;
  const product = await productModel
    .findByIdAndUpdate(
      { _id: id },
      {
        name,
        slug: slugify(name),
        description,
        sold,
        price,
        priceAftereDiscount,
        qr,
        sku,
        serialNumber,
        brand,
        category,
      },
      { new: true }
    )
    .populate({ path: "category", select: "name -_id" })
    .populate({ path: "brand", select: "name -_id" })
    .populate({ path: "variant", select: "name -_id" });
  res.status(200).json({ data: product });
});

exports.deleteProduct = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const product = await productModel.findByIdAndDelete(id);
  res.status(204).send();
});
