const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: { type: String },
  parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  image: String,
});

const setImageURL = (doc) => {
  if (doc.image) {
    const imageUrl = `${process.env.BASE_URL}/category/${doc.image}`;
    doc.image = imageUrl;
  }
};

categorySchema.post("init", (doc) => {
  setImageURL(doc);
});

//Create
categorySchema.post("save", (doc) => {
  setImageURL(doc);
});

module.exports = categorySchema;
