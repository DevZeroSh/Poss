const asyncHandler = require("express-async-handler");
const categorySchema = require("../models/CategoryModel");
const ApiError = require("../utils/apiError");
const mongoose = require("mongoose");
const multer = require("multer");
const multerStorage = multer.memoryStorage();
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");


const multerFilter = function (req, file, cb) {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new ApiError("Only images Allowed", 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadCategoryImage = upload.single("image");

exports.resizerCategoryImage = asyncHandler(async (req, res, next) => {
  const filename = `category-${uuidv4()}-${Date.now()}.png`;

  if (req.file) {
    await sharp(req.file.buffer)
      .resize(200, 200)
      .toFormat("png")
      .png({ quality: 70 })
      .toFile(`uploads/category/${filename}`);

    //save image into our db
    req.body.image = filename;
  }

  next();
});

//@desc Get List category
//@route Get /api/category/
//@access Private
exports.getCategories = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const categoryModel = db.model("categories", categorySchema);
  const category = await categoryModel.find();
  res
    .status(200)
    .json({ status: "true", results: category.length, data: category });
});

//@desc Create  category
//@route Post /api/category
//@access Private
exports.createCategory = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const categoryModel = db.model("Category", categorySchema);

  const category = await categoryModel.create(req.body);
  res
    .status(201)
    .json({ status: "true", message: "Category Inserted", data: category });
});

//@desc Get specific category by id
//@route Get /api/category/:id
//@access Private
exports.getCategory = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const categoryModel = db.model("Category", categorySchema);
  const { id } = req.params;
  const category = await categoryModel.findById(id);

  if (!category) {
    return next(new ApiError(`No Category for this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", data: category });
});

//@desc Update category by id
//@route Put /api/category/:id
//@access Private
exports.updateCategory = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const categoryModel = db.model("Category", categorySchema);
  const { id } = req.params;
  const category = await categoryModel.findByIdAndUpdate(id, req.body, {
    new: true,
  });
  if (!category) {
    return next(new ApiError(`No Category for this id ${id}`, 404));
  }
  res
    .status(200)
    .json({ status: "true", message: "Category updated", data: category });
});

//@desc Delete specific category
//@route Delete /api/category/:id
//@access Private
exports.deleteCategory = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const categoryModel = db.model("Category", categorySchema);
  const { id } = req.params;
  const category = await categoryModel.findByIdAndDelete(id);
  if (!category) {
    return next(new ApiError(`No Category for this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", message: "Category Deleted" });
});
