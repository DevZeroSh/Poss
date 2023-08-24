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
    unique: [true, "variant must be unique"],

  },
});

const variantItemModel = mongoose.model("Variant_Item", variantItemShcma);
module.exports = variantItemModel;
