const mongoose = require("mongoose");

const tagsSchema = new mongoose.Schema({
  tagName: {
    type: String,
    require: true,
    unique: [true, "Tag name must be unique"],
  },
  slug: {
    type: String,
    lowercase: true,
  },
  description: {
    type: String,
  },
});

module.exports = tagsSchema;
