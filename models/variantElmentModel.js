const mongoose = require("mongoose");

const variantItemShcma = new mongoose.Schema({
  variantName:String,
  slug: {
    type: String,
    lowercase: true,
  },
});

const variantItemModel = mongoose.model("Variant_Item", variantItemShcma);
module.exports = variantItemModel;
