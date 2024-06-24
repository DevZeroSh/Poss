const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: { type: String },
  parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  image: String,
  children: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
});

const setImageURL = (doc) => {
  if (doc.image) {
    const imageUrl = `${process.env.BASE_URL}/category/${doc.image}`;
    doc.image = imageUrl;
  }
};
categorySchema.pre(/^find/, function (next) {
  this?.populate({ path: "children" })
  next();
});
categorySchema.post("init", (doc) => {
  setImageURL(doc);
});
categorySchema.post("find", function (docs) {
  docs.forEach(setImageURL);
});
//Create
categorySchema.post("save", (doc) => {
  
  setImageURL(doc);
});

module.exports = categorySchema;
