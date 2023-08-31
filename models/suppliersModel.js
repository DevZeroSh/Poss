const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema({

    supplierName:{
        type:String,
        require:[true,"supplier Name Required"],
        minlength:[3,'Too short supplier name'],
        maxlength:[30,'Too long supplier name'],
    },
    phoneNumber:Number,
    email:{
        type:String,
        required: [true, "email is required"],
        unique: true,
        trim:true,
        lowercase: true,
    },
    companyName:String,
    address:String,
    note:String,

},{timestamps:true});

module.exports = mongoose.model('Supplier',supplierSchema);