const mongoose = require("mongoose");

const TestSchema = new mongoose.Schema({
    name: String,
    slug: {
        type: String,
        lowercase: true,
    },
    code: String,
});

module.exports = TestSchema;
