const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const activeProductsValue = require("../models/activeProductsValueModel");
const currencySchema = require("../models/currencyModel");

// Get all active products values
exports.getAllActiveProductsValues = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const activeProducts = db.model("ActiveProductsValue", activeProductsValue);
  const currencyModel = db.model("Currency", currencySchema);

  try {
    const productsValues = await activeProducts.find();

    let totalActiveProductsCount = 0;
    let totalExchangedValue = 0;

    await Promise.all(
      productsValues.map(async (product) => {
        const { exchangeRate } = await currencyModel.findOne({
          _id: product.currency,
        });

        const exchangedValue = product.activeProductsValue * exchangeRate;

        // Aggregate the totals
        totalActiveProductsCount += product.activeProductsCount;
        totalExchangedValue += exchangedValue;
      })
    );

    // Create the result object with totals
    const result = {
      totalActiveProductsCount,
      totalExchangedValue,
    };

    // Send the result in the response
    res.status(200).json({ status: "true", data: result });
  } catch (error) {
    res.status(500).json({
      error: `Error getting active products values: ${error.message}`,
    });
  }
});
