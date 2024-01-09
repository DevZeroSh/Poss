const mongoose = require("mongoose");

const rolePosSchema = new mongoose.Schema({
    title: String,
    desc: String,
});

//const rolePosModel = mongoose.model("RolePos", rolePosSchema);

module.exports = rolePosSchema;
