const mongoose = require("mongoose");
const activeProductsValue = require("../models/activeProductsValueModel");
const ApiError = require("./apiError");

const createActiveProductsValue = async (quantity, value, currency, dbName) => {
  const db = mongoose.connection.useDb(dbName);
  const ActiveProductsValue = db.model(
    "ActiveProductsValue",
    activeProductsValue
  );

  try {
    let existingRecord = await ActiveProductsValue.findOne({ currency });

    if (!existingRecord) {
      const newData = new ActiveProductsValue({
        currency,
        activeProductsCount: quantity,
        activeProductsValue: value,
      });
      const savedData = await newData.save();
      return savedData;
    } else {
      existingRecord.activeProductsCount += quantity;
      existingRecord.activeProductsValue += value;
      const savedData = await existingRecord.save();
      return savedData;
    }
  } catch (error) {
    return new ApiError(`Error creating/updating data: ${error.message}`, 500);
  }
};

module.exports = { createActiveProductsValue };
