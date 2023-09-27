const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const ApiError = require("./utils/apiError");
const globalError = require("./middlewares/errorMiddleware");
const cors = require("cors");
const morgan = require("morgan");

dotenv.config({ path: "config.env" });

//Routes
const dbContacion = require("./config/database");
const productRout = require("./routes/productRout");
const brandRout = require("./routes/brandRout");
const categoryRout = require("./routes/categoryRout");
const userRout = require("./routes/userRout");
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

const app = express();
app.use(express.json());
app.use(cors());

//Connection to DataBase
dbContacion();

app.use(express.static(path.join(__dirname, "uploads")));
if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
    console.log(`mode: ${process.env.NODE_ENV}`);
}

//Routes' links
app.use("/api/product", productRout);
app.use("/api/brand", brandRout);
app.use("/api/category", categoryRout);
app.use("/api/user", userRout);
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

app.all("*", (req, res, next) => {
    //Create Error And Send it to error handling middleware
    next(new ApiError(`Can't find this route:${req.originalUrl}`, 400));
});

//Global error handling middleware for express
app.use(globalError);

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
    console.log(`app running on port ${PORT}`);
});

process.on("unhandledRejection", (err) => {
    console.error(`unhandledRejection Errors:${err.name} | ${err.message}`);
    server.close(() => {
        console.error(`Shutting down....`);
        process.exit(1);
    });
});
