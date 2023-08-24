const mongoose = require("mongoose");

const variantItemShcma = new mongoose.Schema({
  variantName: [String],
  slug: {
    type: String,
    lowercase: true,
  },
  varuant: {
    type: mongoose.Schema.ObjectId,
    ref: "Variant",
  },
});

const variantItemModel = mongoose.model("Variant_Item", variantItemShcma);
module.exports = variantItemModel;
