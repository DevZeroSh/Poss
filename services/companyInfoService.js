const asyncHandler = require("express-async-handler");
const CompanyInfnoModel = require("../models/companyInfoModel");
const currencyModel = require("../models/currencyModel");

const multer = require("multer");
const ApiError = require("../utils/apiError");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const multerStorage = multer.memoryStorage();

const multerFilter = function (req, file, cb) {
    if (file.mimetype.startsWith("image")) {
        cb(null, true);
    } else {
        cb(new ApiError("Only images allowed", 400), false);
    }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadCompanyLogo = upload.single("companyLogo");

exports.resizerLogo = asyncHandler(async (req, res, next) => {
    const filename = `company-${uuidv4()}-${Date.now()}.jpeg`;

    if (req.file) {
        await sharp(req.file.buffer).toFormat("jpeg").jpeg({ quality: 90 }).toFile(`uploads/companyinfo/${filename}`);
        req.body.companyLogo = filename;
    }

    next();
});

//@desc create company info
//@route post /api/companyinfo
exports.createCompanyInfo = asyncHandler(async (req, res, next) => {
    const companyInfo = await CompanyInfnoModel.create(req.body);
    res.status(201).json({ status: "true", message: "Company info inserted", data: companyInfo });
});

//Get company info
//@rol: who has rol can Get Customars Data
exports.getCompanyInfo = asyncHandler(async (req, res, next) => {
    const companyInfos = await CompanyInfnoModel.find();
    const currency = await currencyModel.find({ is_primary: true });

    res.status(200).json({ status: "true", data: companyInfos, currency });
});

exports.updataCompanyInfo = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    console.log(req.body);
    console.log(req.params);
    const companyInfo = await CompanyInfnoModel.findByIdAndUpdate({ _id: id }, req.body, { new: true });

    if (!companyInfo) {
        return next(new ApiError(`There is no company with this id ${id}`, 404));
    } else {
        res.status(200).json({ status: "true", message: "Company info updated", data: companyInfo });
    }
});
