const mongoose = require("mongoose");

const TaxSchema = new mongoose.Schema({
  tax: { type: Number, unique: [true, "Tax must be unique"] },
  name: String,
  description: String,
  slug: {
    type: String,
    lowercase: true,
  },
});

const TaxModel = mongoose.model("Tax", TaxSchema);

module.exports = TaxModel;
