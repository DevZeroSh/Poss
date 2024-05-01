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
      {
        title: "roles",
        desc: "Roles",
        info: "This feature will allow you to add and modify Roles",
      },
      {
        title: "new Definitions",
        desc: "Definitions",
        info: "This feature will allow you to add and modify definitions",
      },
      {
        title: "currency",
        desc: "Currency",
        info: "This feature allows you to add and modify the currency",
      },
      {
        title: "customer",
        desc: "customer",
        info: "This feature allows you to add and modify the customer",
      },
      {
        title: "delete customer",
        desc: "customer",
        info: "This feature allows you to delete customer",
      },
      {
        title: "delete currency",
        desc: "currency",
        info: "This feature allows you to delete currency",
      },
      {
        title: "delete Definitions",
        desc: "Definitions",
        info: "This feature allows you to delete Definitions",
      },
      {
        title: "delete Definitions",
        desc: "Definitions",
        info: "This feature allows you to delete Definitions",
      },
      {
        title: "discount",
        desc: "Discount",
        info: "This feature allows you to delete discount",
      },
      {
        title: "expense category",
        desc: "Expense Category",
        info: "This feature allows you to add and modify Expense Category",
      },
      {
        title: "delete expense category",
        desc: "Expense Category",
        info: "This feature allows you to Delete Expense Category",
      },
      {
        title: "expenses",
        desc: "Invoices",
        info: "This feature allows you to add and modify expenses",
      },
      {
        title: "financial funds",
        desc: "Financial Funds",
        info: "This feature allows you to add and modify financial funds",
      },
      {
        title: "delete financial funds",
        desc: "Financial Funds",
        info: "This feature allows you to delete financial funds",
      },
      {
        title: "transfer financial funds",
        desc: "Financial Funds",
        info: "This feature allows you to transfer between funds",
      },
      {
        title: "payment Type",
        desc: "Payment Type",
        info: "This feature allows you to create payment methods",
      },
      {
        title: "delete payment Type",
        desc: "Payment Type",
        info: "This feature allows you to delete payment methods",
      },
      {
        title: "Category pricing",
        desc: "Category pricing",
        info: "This feature allows you to create and modify category pricing",
      },
      {
        title: "Product Movments",
        desc: "Product Movments",
        info: "This feature allows you to show the movement of products",
      },
      {
        title: "product",
        desc: "Product",
        info: "This feature allows you to add and modify products",
      },
      {
        title: "delete product",
        desc: "Product",
        info: "This feature allows you to delete products",
      },
      {
        title: "ProfitLoss",
        desc: "ProfitLoss",
        info: "This feature allows you to add, modify, and display the profit and loss report",
      },
      {
        title: "Financial Funds Reports",
        desc: "Financial Funds",
        info: "This feature allows you to view fund reports",
      },
      {
        title: "supllier",
        desc: "Supplier",
        info: "This feature allows you to add and modify suppliers",
      },
      {
        title: "delete supllier",
        desc: "Supplier",
        info: "This feature allows you to delete suppliers",
      },
      {
        title: "Show Product",
        desc: "Product",
        info: "These allow you to display products and show their details",
      },
      {
        title: "company info",
        desc: "Company",
        info: "This property displays company information",
      },
      {
        title: "employee",
        desc: "Employee",
        info: "This feature will allow you to add and modify employee",
      },
      {
        title: "delete employee",
        desc: "Employee",
        info: "This feature will allow you to delete the employee",
      },
      {
        title: "Sales Invoices",
        desc: "Invoices",
        info: "This feature will allow you to delete the employee",
      },
      {
        title: "Refund sales Invoices",
        desc: "Invoices",
        info: "This feature allows you to return a sales invoice",
      },
      {
        title: "Purchase Invoices",
        desc: "Invoices",
        info: "This feature will allow you to add and modify Purchase",
      },
      {
        title: "Refund purchase Invoices",
        desc: "Invoices",
        info: "This feature allows you to return a purchase invoice",
      },
      {
        title: "view reports",
        desc: "Reports",
        info: "This feature will allow Show reports",
      },
      {
        title: "approve reconciliation",
        desc: "Stok",
        info: "This feature will allow you to confirm inventory",
      },
      {
        title: "Dashboard",
        desc: "Dashboard",
        info: "This feature gives you access to the dashboard and modify your personal profile",
      },
      {
        title: "Add Payment",
        desc: "Payment",
        info: "This feature will allow you to add and modify payment",
      },
      {
        title: "Show Payment",
        desc: "Payment",
        info: "This feature will allow you to Show payment",
      },
      {
        title: "Dashboard Reports",
        desc: "Dashboard",
        info: "This will give you full permissions on the Dashboard page only",
      },
      {
        title: "FingerPrintReports",
        desc: "HR",
        info: "This will give you full permissions on the FingerPrint Reports page only",
      },
    ];

    const mainDashboardRoles = await roleDashboardModel.insertMany(
      allDashRoles
    );

    //3-insert all pos roles
    const allPosRoles = [
      { title: "discount", desc: "discount" },
      { title: "pos", desc: "pos" },
      { title: "Refund Sales", desc: "Refund" },
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
        pinCode: req.body.pinCode,
        color: req.body.color,
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
