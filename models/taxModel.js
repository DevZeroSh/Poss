const mongoose = require("mongoose");

const TaxSchema = new mongoose.Schema({
  tax: { type: Number, unique: [true, "Tax must be unique"] },
});

const TaxModel = mongoose.model("Tax", TaxSchema);

module.exports = TaxModel;
