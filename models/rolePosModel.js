const mongoose = require("mongoose");

const rolePosSchema = new mongoose.Schema({
    title: String,
    info: String,
    desc: String,
});

module.exports = rolePosSchema;
