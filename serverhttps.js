const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const globalError = require("./middlewares/errorMiddleware");
const cors = require("cors");
const morgan = require("morgan");
const https = require("https");
const fs = require("fs");
const dbConnection = require("./config/database");

dotenv.config({ path: "config.env" });
//Routes
const productRout = require("./routes/productRout");
const brandRout = require("./routes/brandRout");
const categoryRout = require("./routes/categoryRout");
const variantRout = require("./routes/variantRout");
const customarRoute = require("./routes/customarRoute");
const supplierRoute = require("./routes/supplierRoute");
const RoleDashboardRoute = require("./routes/roleDashboardRoute");
const RolePosRoute = require("./routes/rolePosRoute");
const roleRoute = require("./routes/roleRoute");
const employeeRoute = require("./routes/employeeRoute");
const unitRout = require("./routes/unitRout");
const taxRout = require("./routes/taxRout");
const discountRoute = require("./routes/discountRoute");
const paymentTypes = require("./routes/paymentTypesRoute");
// const cartRout = require("./routes/cartRout");
const LabelRout = require("./routes/labelsRout");
const authRoute = require("./routes/authRoute");
const currencyRoute = require("./routes/currencyRoute");
const OrderRout = require("./routes/orderRout");
const financialFundsRoute = require("./routes/financialFundsRoute");
const expensesRoute = require("./routes/expensesRoute");
const productInvoicesRout = require("./routes/purchaseInvoices");
const expenseCategoriesRoute = require("./routes/expensesCategoryRoute");
const companyInfoRoute = require("./routes/companyInfoRoute");
const reportsFinancialFundRoute = require("./routes/reportsFinancialFundsRoute");
const pricingMethodRoute = require("./routes/pricingMethodRoute");
const reportsSalesRoute = require("./routes/reportsSalesRoute");

dotenv.config({ path: "config.env" });

dbConnection();

const app = express();

app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, "uploads")));
if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
    console.log(`mode: ${process.env.NODE_ENV}`);
}

//Routes' links
app.use("/api/product", productRout);
app.use("/api/brand", brandRout);
app.use("/api/category", categoryRout);
app.use("/api/variant", variantRout);
app.use("/api/customars", customarRoute);
app.use("/api/suppliers", supplierRoute);
app.use("/api/roledashboard", RoleDashboardRoute);
app.use("/api/rolepos", RolePosRoute);
app.use("/api/role", roleRoute);
app.use("/api/employee", employeeRoute);
app.use("/api/discount", discountRoute);
app.use("/api/unit", unitRout);
app.use("/api/tax", taxRout);
app.use("/api/paymenttype", paymentTypes);
app.use("/api/label", LabelRout);
app.use("/api/auth", authRoute);
app.use("/api/orders", OrderRout);
app.use("/api/currency", currencyRoute);
app.use("/api/financialfunds", financialFundsRoute);
app.use("/api/expenses", expensesRoute);
app.use("/api/productinvoices", productInvoicesRout);
app.use("/api/expenseCategories", expenseCategoriesRoute);
app.use("/api/companyinfo", companyInfoRoute);
app.use("/api/financialfundsreports", reportsFinancialFundRoute);
app.use("/api/salesreports", reportsSalesRoute);
app.use("/api/pricingmethod", pricingMethodRoute);
app.use(globalError);
const PORT = process.env.PORT || 8080;

const privateKey = fs.readFileSync("/etc/letsencrypt/live/nooncar.com/privkey.pem", "utf8");
const certificate = fs.readFileSync("/etc/letsencrypt/live/nooncar.com/fullchain.pem", "utf8");
const credentials = { key: privateKey, cert: certificate };

const httpsServer = https.createServer(credentials, app);

httpsServer.listen(PORT, () => {
    console.log(`App running on port ${PORT} using HTTPS`);
});
