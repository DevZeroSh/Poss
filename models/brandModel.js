const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    require: true,
    unique: [true, "brand must be unique"],
  },
  nameAR: {
    type: String,
    require: true,
    unique: [true, "brand must be unique"],
  },
  nameTR: {
    type: String,
    require: true,
    unique: [true, "brand must be unique"],
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
  image: String,
});
const setImageURL = (doc) => {
  if (doc.image) {
    const imageUrl = `${process.env.BASE_URL}/brand/${doc.image}`;
    doc.image = imageUrl;
  }
};

brandSchema.post("init", function (doc) {
  if (Array.isArray(doc)) {
    doc.forEach(setImageURL);
  } else {
    setImageURL(doc);
  }
});

//Create
brandSchema.post("save", (doc) => {
  setImageURL(doc);
});

module.exports = brandSchema;
