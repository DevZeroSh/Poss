const mongoose = require("mongoose");

const roleShcema = new mongoose.Schema({
  name: {
    type: String,
    require: [true, " role name is require"],
    unique: true,
  },
  slug: {
    type: String,
    lowercase: true,
  },
  description: {
    type: String,
  },
});

const roleModel = mongoose.model("Role", roleShcema);

module.exports = roleModel;
