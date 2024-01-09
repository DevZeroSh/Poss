const mongoose = require("mongoose");

const rolePosSchema = new mongoose.Schema({
    title: String,
    desc: String,
});

module.exports = rolePosSchema;
