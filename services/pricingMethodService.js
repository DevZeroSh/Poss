const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const pricingMethodSchema = require("../models/pricingMethodModel");
const categorySchema = require("../models/CategoryModel");

//@desc Get list of pricing methods
//@route GET  /api/pricingmethod
//@accsess Private
exports.getPricingMethods = asyncHandler(async (req, res) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const PricingMethodModel = db.model("PricingMethod", pricingMethodSchema);
  db.model("Category", categorySchema);

  const pricingMethod = await PricingMethodModel.find().populate({
    path: "selectedCategory",
  });
  res.status(200).json({ status: "true", data: pricingMethod });
});

//@desc Create a pricing Method
//@route POST /api/pricingmethod
//accsess private
exports.createPricingMethod = asyncHandler(async (req, res, next) => {
  try {
    const catId = new mongoose.Types.ObjectId(req.body.selectedCategory);
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const PricingMethodModel = db.model("PricingMethod", pricingMethodSchema);
    const categoryModel = db.model("categories", categorySchema);

    const category = await categoryModel.findById(catId);

    // Check if the category has a parent or not
    if (category.parentCategory) {
      // Yes
      // Check if the catId exists in Pricing Method table
      const pricingMethod = await PricingMethodModel.findOne({
        selectedCategory: catId,
      });
      if (pricingMethod) {
        // Yes, just update itself
        pricingMethod.percentageIncrease = req.body.percentageIncrease;
        await pricingMethod.save();
        res
          .status(200)
          .json({ status: "true", message: "Updated", data: pricingMethod });
      } else {
        // No, just add it
        const addPricingMethod = await PricingMethodModel.create(req.body);
        res.status(200).json({
          status: "true",
          message: "Inserted",
          data: addPricingMethod,
        });
      }
    } else {
      // No
      // Check if the catId exists in Pricing Method table
      const pricingMethod = await PricingMethodModel.findOne({
        selectedCategory: catId,
      });
      if (pricingMethod) {
        // Edit to all children of the category
        const editCategoryAndChildren = async (categoryId) => {
          const theCat = await categoryModel.findById(categoryId);
          await PricingMethodModel.findOneAndUpdate(
            { selectedCategory: theCat._id },
            { $set: { percentageIncrease: req.body.percentageIncrease } },
            { new: true, upsert: true }
          );

          const children = await categoryModel.find({
            parentCategory: theCat._id,
          });
          for (const child of children) {
            await editCategoryAndChildren(child._id);
          }
        };

        await editCategoryAndChildren(catId);
        res.status(200).json({ status: "true", message: "Updated" });
      } else {
        const addCategoryAndChildren = async (categoryId) => {
          try {
            const theCategory = await categoryModel.findById(categoryId);
            const existingPricingMethod = await PricingMethodModel.findOne({
              selectedCategory: theCategory._id,
            });
      
            if (!existingPricingMethod) {
              await PricingMethodModel.create({
                selectedCategory: theCategory._id,
                percentageIncrease: req.body.percentageIncrease,
              });
            } else {
              console.log("Skipping due to existing document");
            }
      
            const children = await categoryModel.find({
              parentCategory: theCategory._id,
            });
      
            for (const child of children) {
              await addCategoryAndChildren(child._id);
            }
          } catch (error) {
            // Handle the specific error here (if needed)
            console.error(`Error in addCategoryAndChildren: ${error.message}`);
          }
        };
      
        await addCategoryAndChildren(catId);
        res.status(200).json({ status: "true", message: "Inserted" });
      }
      
    }
  } catch (error) {
    return next(
      new ApiError(`Error in createPricingMethod: ${error.message}`, 500)
    );
  }
});

//@desc get specific category pricing method for category
//@route GET /api/pricingmethod/:id
//accsess private
exports.getSpecificCategoryPricing = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const PricingMethodModel = db.model("PricingMethod", pricingMethodSchema);

  const specificCategory = await PricingMethodModel.findOne({
    selectedCategory: id,
  });
  res.status(200).json({ status: "true", data: specificCategory });
});
