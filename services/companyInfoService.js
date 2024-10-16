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
const stockSchema = require("../models/stockModel");
const thirdPartyAuthSchema = require("../models/ecommerce/thirdPartyAuthModel");
const ecommercePaymentMethodSchema = require("../models/ecommerce/ecommercePaymentMethodModel");
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
  const filename = `company-${uuidv4()}-${Date.now()}.png`;

  if (req.file) {
    await sharp(req.file.buffer)
      .toFormat("png")
      .png({ quality: 90 })
      .toFile(`uploads/companyinfo/${filename}`);
    req.body.companyLogo = filename;
  }

  next();
});

//@desc Create company info
//@route POST /api/companyinfo
exports.createCompanyInfo = asyncHandler(async (req, res, next) => {
  try {
    const dbName = req.body.databaseName;
    const db = mongoose.connection.useDb(dbName);

    const CompanyInfnoModel = db.model("CompanyInfo", companyIfnoSchema);
    const roleDashboardModel = db.model("RoleDashboard", roleDashboardSchema);
    const rolePosModel = db.model("RolePos", rolePosSchema);
    const rolesModel = db.model("Roles", rolesShcema);
    const currencyModel = db.model("Currency", currencySchema);
    const StockModel = db.model("Stock", stockSchema);
    const thirdPartyAuthModel = db.model(
      "thirdPartyAuth",
      thirdPartyAuthSchema
    );
    const paymentMethodModel = db.model(
      "ecommercePaymentMethods",
      ecommercePaymentMethodSchema
    );

    //await createConnection(req.body.databaseName);
    //1-craet a company
    const companyInfo = await CompanyInfnoModel.create(req.body);

    //2-insert all main dashboard roles
    const allDashRoles = [
      // Dashboard Start
      {
        title: "Dashboard Reports",
        desc: "Dashboard",
        info: "This will give you full permissions on the Dashboard page only",
      },
      {
        title: "Dashboard",
        desc: "Dashboard",
        info: "This feature gives you access to the dashboard and edit your personal profile",
      },
      // Sales Invoices Start
      {
        title: "Customer",
        desc: "Customer",
        info: "add and edit the customer",
      },
      {
        title: "Delete Customer",
        desc: "Customer",
        info: "delete customer",
      },
      {
        title: "Sales Invoices",
        desc: "Invoices",
        info: "This feature will allow you to delete the employee",
      },
      {
        title: "Refund Sales Invoices",
        desc: "Invoices",
        info: "return a sales invoice",
      },
      {
        title: "Quotation ",
        desc: "Purchase & Price Offers",
        info: "add and edit a price quote",
      },
      {
        title: "Delete Quotation",
        desc: "Purchase & Price Offers",
        info: "delete a price quote",
      },
      // Purchase Invoices Start
      {
        title: "Supplier",
        desc: "Supplier",
        info: "add and edit suppliers",
      },
      {
        title: "Delete Supplier",
        desc: "Supplier",
        info: "delete suppliers",
      },
      {
        title: "Purchase Invoices",
        desc: "Invoices",
        info: "add and edit Purchase",
      },
      {
        title: "Refund Purchase Invoices",
        desc: "Invoices",
        info: "return a purchase invoice",
      },
      {
        title: "Purchase Request",
        desc: "Purchase & Price Offers",
        info: "add and edit a purchase request",
      },
      // Stock Start
      {
        title: "Product",
        desc: "Product",
        info: "add and edit products",
      },
      {
        title: "Archive Product",
        desc: "Product",
        info: "Archive product, keep records intact.",
      },
      {
        title: "Product Movments",
        desc: "Product Movments",
        info: "show the movement of products",
      },
      {
        title: "Show Product",
        desc: "Product",
        info: "These allow you to display products and show their details",
      },
      // Financial Start
      {
        title: "roles",
        desc: "Roles",
        info: "This feature will allow you to add and edit Roles",
      },
      {
        title: "new Definitions",
        desc: "Definitions",
        info: "This feature will allow you to add and edit definitions",
      },
      {
        title: "currency",
        desc: "Currency",
        info: "add and edit the currency",
      },

      {
        title: "delete currency",
        desc: "currency",
        info: "delete currency",
      },
      {
        title: "edit Definitions",
        desc: "Definitions",
        info: "edit Definitions",
      },
      {
        title: "delete Definitions",
        desc: "Definitions",
        info: "delete Definitions",
      },
      {
        title: "discount",
        desc: "Discount",
        info: "delete discount",
      },
      {
        title: "expense category",
        desc: "Expense Category",
        info: "add and edit Expense Category",
      },
      {
        title: "delete expense category",
        desc: "Expense Category",
        info: "Delete Expense Category",
      },
      {
        title: "expenses",
        desc: "Invoices",
        info: "add and edit expenses",
      },
      {
        title: "financial funds",
        desc: "Financial Funds",
        info: "add and edit financial funds",
      },
      {
        title: "delete financial funds",
        desc: "Financial Funds",
        info: "delete financial funds",
      },
      {
        title: "transfer financial funds",
        desc: "Financial Funds",
        info: "transfer between funds",
      },
      {
        title: "payment Type",
        desc: "Payment Type",
        info: "create payment methods",
      },
      {
        title: "delete payment Type",
        desc: "Payment Type",
        info: "delete payment methods",
      },
      {
        title: "Category pricing",
        desc: "Category pricing",
        info: "create and edit category pricing",
      },
      {
        title: "ProfitLoss",
        desc: "ProfitLoss",
        info: "add, edit, and display the profit and loss report",
      },
      {
        title: "Financial Funds Reports",
        desc: "Financial Funds",
        info: "view fund reports",
      },

      {
        title: "company info",
        desc: "Company",
        info: "This property displays company information",
      },
      {
        title: "employee",
        desc: "Employee",
        info: "This feature will allow you to add and edit employee",
      },
      {
        title: "delete employee",
        desc: "Employee",
        info: "This feature will allow you to delete the employee",
      },

      {
        title: "view reports",
        desc: "Reports",
        info: "This feature will allow Show reports",
      },
      {
        title: "approve reconciliation",
        desc: "Stock",
        info: "This feature will allow you to confirm inventory",
      },

      {
        title: "Add Payment",
        desc: "Payment",
        info: "This feature will allow you to add and edit payment",
      },
      {
        title: "Show Payment",
        desc: "Payment",
        info: "This feature will allow you to Show payment",
      },

      {
        title: "FingerPrintReports",
        desc: "HR",
        info: "This will give you full permissions on the FingerPrint Reports page only",
      },

      {
        title: "Maintenance Reception",
        desc: "Maintenance",
        info: "The maintenance department at the reception enters customers, cases and devices",
      },

      {
        title: "Maintenance Technical",
        desc: "Maintenance",
        info: "The technician who sets the parts, prices, and invoice",
      },
    ];

    const mainDashboardRoles = await roleDashboardModel.insertMany(
      allDashRoles
    );
    const stock = await StockModel.create({ name: "main Stcok" });
    //3-insert all pos roles
    const allPosRoles = [
      { title: "pos", desc: "pos" },
      { title: "pos Offers", desc: "pos" },
      { title: "pos Sales Invoices", desc: "pos" },
      { title: "discount", desc: "discount" },
      { title: "Refund Sales", desc: "Refund" },
    ];

    const mainPosRoles = await rolePosModel.insertMany(allPosRoles);

    //4-insert the main role
    // Extract IDs from the inserted documents
    const dashboardRoleIds = mainDashboardRoles.map((role) => role._id);
    const posRoleIds = mainPosRoles.map((role) => role._id);
    const insertMainRole = await rolesModel.create({
      name: "The owner",
      description: "Role Description",
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

    //6- Insert the 3rd party auth
    await thirdPartyAuthModel.create({
      googleAuthClientID: "",
      googleAuthClientSecret: "",
      facebookAuthAppID: "",
      redirectUri: "",
    });

    //7- Insert the e-commerce payment methods
    await paymentMethodModel.create([
      {
        name: "onlinePayment",
        description: "",
        extraCharge: 1,
        minAmount: 1,
        maxAmount: 99999,
        status: false,
      },
      {
        name: "bankTransfer",
        description: "",
        extraCharge: 1,
        minAmount: 1,
        maxAmount: 99999,
        status: false,
      },
      {
        name: "payAtDoor",
        description: "",
        extraCharge: 1,
        minAmount: 1,
        maxAmount: 99999,
        status: false,
      },
    ]);

    //Finally, make res
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
//@role: who has role can Get company info
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
        companyName: req.body.companyName,
        companyAddress: req.body.companyAddress,
        companyTax: req.body.companyTax,
        companyTel: req.body.companyTel,
        companyLogo: req.body.companyLogo,
        pinCode: req.body.pinCode,
        color: req.body.color,
        havePin: req.body.havePin,
        facebookUrl: req.body.facebookUrl,
        instagramUrl: req.body.instagramUrl,
        xtwitterUrl: req.body.xtwitterUrl,
        linkedinUrl: req.body.linkedinUrl,
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
