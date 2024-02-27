const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const companyIfnoSchema = require("../models/companyInfoModel");
const currencySchema = require("../models/currencyModel");
const multer = require("multer");
const ApiError = require("../utils/apiError");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const rolePosSchema = require("../models/rolePosModel");
const roleDashboardSchema = require("../models/roleDashboardModel");
const rolesShcema = require("../models/roleModel");
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
        await sharp(req.file.buffer)
            .toFormat("jpeg")
            .jpeg({ quality: 90 })
            .toFile(`uploads/companyinfo/${filename}`);
        req.body.companyLogo = filename;
    }

    next();
});

//@desc create company info
//@route post /api/companyinfo
exports.createCompanyInfo = asyncHandler(async (req, res, next) => {
    try {
        console.log(req.body);

        const dbName = req.body.databaseName;
        const db = mongoose.connection.useDb(dbName);

        const CompanyInfnoModel = db.model("CompanyInfo", companyIfnoSchema);
        const roleDashboardModel = db.model("RoleDashboard", roleDashboardSchema);
        const rolePosModel = db.model("RolePos", rolePosSchema);
        const rolesModel = db.model("Roles", rolesShcema);
        const currencyModel = db.model("Currency", currencySchema);

        //await createConnection(req.body.databaseName);
        //1-craet a company
        const companyInfo = await CompanyInfnoModel.create(req.body);

        //2-insert all main dashboard roles
        const allDashRoles = [
            { title: "new product", desc: "product" },
            { title: "edit product", desc: "product" },
            { title: "delete product", desc: "product" },
            { title: "new category", desc: "category" },
            { title: "edit category", desc: "category" },
            { title: "delete category", desc: "category" },
            { title: "new brand", desc: "brand" },
            { title: "edit brand", desc: "brand" },
            { title: "delete brand", desc: "brand" },
            { title: "new variant", desc: "variant" },
            { title: "edit variant", desc: "variant" },
            { title: "delete variant", desc: "variant" },
            { title: "new unit", desc: "unit" },
            { title: "edit unit", desc: "unit" },
            { title: "delete unit", desc: "unit" },
            { title: "new tax", desc: "tax" },
            { title: "edit tax", desc: "tax" },
            { title: "delete tax", desc: "tax" },
            { title: "new label", desc: "label" },
            { title: "edit label", desc: "label" },
            { title: "delete label", desc: "label" },
            { title: "new customer", desc: "customer" },
            { title: "edit customer", desc: "customer" },
            { title: "delete customer", desc: "customer" },
            { title: "new supllier", desc: "supllier" },
            { title: "edit supllier", desc: "supllier" },
            { title: "delete supllier", desc: "supllier" },
            { title: "new employee", desc: "employee" },
            { title: "edit employee", desc: "employee" },
            { title: "delete employee", desc: "employee" },
            { title: "roles", desc: "roles" },
            { title: "new discount", desc: "discount" },
            { title: "edit discount", desc: "discount" },
            { title: "delete discount", desc: "discount" },
            { title: "new payment", desc: "payment" },
            { title: "edit payment", desc: "payment" },
            { title: "delete payment", desc: "payment" },
            { title: "dashboard", desc: "dashboard" },
            { title: "brand", desc: "brand" },
            { title: "customer", desc: "customer" },
            { title: "discount", desc: "discount" },
            { title: "employee", desc: "employee" },
            { title: "label", desc: "label" },
            { title: "payment", desc: "payment" },
            { title: "product", desc: "product" },
            { title: "supllier", desc: "supllier" },
            { title: "tax", desc: "tax" },
            { title: "unit", desc: "unit" },
            { title: "variant", desc: "variant" },
            { title: "category", desc: "category" },
            { title: "currency", desc: "currency" },
            { title: "financial funds", desc: "financial funds" },
            { title: "new financial funds", desc: "financial funds" },
            { title: "edit financial funds", desc: "financial funds" },
            { title: "delete financial funds", desc: "financial funds" },
            { title: "expenses", desc: "expenses" },
            { title: "expense category", desc: "expense category" },
            { title: "Purchase Invoices", desc: "Purchase Invoices" },
            { title: "company info", desc: "company info" },
            { title: "pricing method", desc: "pricing method" },
            { title: "edit pricing method", desc: "pricing method" },
            { title: "delete pricing method", desc: "pricing method" },
            { title: "new pricing method", desc: "pricing method" },
            { title: "view reports", desc: "reports" },
            { title: "approve reconciliation", desc: "approve the reconciliations" },
        ];

        const mainDashboardRoles = await roleDashboardModel.insertMany(allDashRoles);

        //3-insert all pos roles
        const allPosRoles = [
            { title: "discount", desc: "discount" },
            { title: "pos", desc: "pos" },
        ];

        const mainPosRoles = await rolePosModel.insertMany(allPosRoles);

        //4-insert the main role
        // Extract IDs from the inserted documents
        const dashboardRoleIds = mainDashboardRoles.map((role) => role._id);
        const posRoleIds = mainPosRoles.map((role) => role._id);
        const insertMainRole = await rolesModel.create({
            name: "The owner", // Replace with the actual role name
            description: "Role Description", // Replace with the actual role description
            rolesDashboard: dashboardRoleIds,
            rolesPos: posRoleIds,
        });

        //5-insert the main currency
        await currencyModel.create({
            currencyCode: req.body.currencyCode,
            currencyName: req.body.currencyName,
            exchangeRate: "1",
            is_primary: "true",
        });

        //make res
        res.status(201).json({
            status: "true",
            message: "Company info inserted",
            data: {
                company: companyInfo,
                mainRoleId: insertMainRole._id,
            },
        });
    } catch (error) {
        console.log(error);
    }
});

//Get company info
//@rol: who has rol can Get Customars Data
exports.getCompanyInfo = asyncHandler(async (req, res, next) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const CompanyInfnoModel = db.model("CompanyInfo", companyIfnoSchema);
    const currencyModel = db.model("Currency", currencySchema);
    const companyInfos = await CompanyInfnoModel.find();
    const currency = await currencyModel.find({ is_primary: true });

    res.status(200).json({ status: "true", data: companyInfos, currency });
});

exports.updataCompanyInfo = asyncHandler(async (req, res, next) => {
    try {
        const { id } = req.params;
        const dbName = req.query.databaseName;

        const db = mongoose.connection.useDb(dbName);
        const CompanyInfnoModel = db.model("CompanyInfo", companyIfnoSchema);

        const companyInfo = await CompanyInfnoModel.findByIdAndUpdate(
            { _id: id },
            {
                companyAddress: req.body.companyAddress,
                companyTax: req.body.companyTax,
                companyTel: req.body.companyTel,
                companyLogo: req.body.companyLogo,
            },
            {
                new: true,
            }
        );
        if (!companyInfo) {
            return next(new ApiError(`There is no company with this id ${id}`, 404));
        } else {
            res.status(200).json({
                status: "true",
                message: "Company info updated",
                data: companyInfo,
            });
        }
    } catch (error) {
        console.log(error);
    }
});
