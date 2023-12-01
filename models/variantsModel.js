const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  variant: {
    type: String,
    require: true,
    unique: [true, "variant must be unique"],
  },
  slug: {
    type: String,
    lowercase: true,
  },
  description: {
    type: String,
  },
  value: [String],
});

const variantModel = mongoose.model("Variant", variantSchema);
module.exports = variantModel;
