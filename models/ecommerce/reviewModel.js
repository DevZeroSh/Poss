const mongoose = require("mongoose");
const productSchema = require("../productModel");
const categorySchema = require("../CategoryModel");
const brandSchema = require("../brandModel");
const labelsSchema = require("../labelsModel");
const TaxSchema = require("../taxModel");
const UnitSchema = require("../UnitsModel");
const variantSchema = require("../variantsModel");
const currencySchema = require("../currencyModel");

const reviewSchema = new mongoose.Schema(
  {
    title: { type: String },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    customar: {
      type: mongoose.Schema.ObjectId,
      ref: "Customar",
    },
    product: {
      type: mongoose.Schema.ObjectId,
      ref: "Product",
      required: true,
    },
  },
  { timestamps: true }
);
reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: "customar",
    select: "name",
  });
  next();
});
reviewSchema.statics.calcAverageRatingsAndQuantity = async function (
  productId,
  dbName
) {
  const db = mongoose.connection.useDb(dbName);
  const Product = db.model("Product", productSchema);
  db.model("Category", categorySchema);
  db.model("brand", brandSchema);
  db.model("Labels", labelsSchema);
  db.model("Tax", TaxSchema);
  db.model("Unit", UnitSchema);
  db.model("Variant", variantSchema);
  db.model("Currency", currencySchema);
  const result = await this.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: "product",
        avgRatings: { $avg: "$ratings" },
        ratingsQuantity: { $sum: 1 },
      },
    },
  ]);

  console.log(result)
  if (result.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      ratingsAverage: result[0].avgRatings,
      ratingsQuantity: result[0].ratingsQuantity,
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      ratingsAverage: 0,
      ratingsQuantity: 0,
    });
  }
};

module.exports = reviewSchema;
