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
    minlength: [9, "too short brand description"],
    maxlength: [100, "too long brand description"],
  },
});

const variantModel = mongoose.model("Variant", variantSchema);
module.exports = variantModel;
