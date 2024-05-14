const mongoose = require("mongoose");

const pageSchema = new mongoose.Schema(
  {
    name: String,
    title: {
      type: String,
      required: true,
      unique: true,
    },

    description: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = pageSchema;
