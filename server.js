const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");

dotenv.config({ path: "config.env" });

//Routes
const dbContacion = require("./config/database");
const productRout = require("./routes/productRout");
const brandRout = require("./routes/brandRout");
const categoryRout = require("./routes/categoryRout");
const roleRout = require("./routes/roleRout");
const userRout = require("./routes/userRout");
const variantRout = require("./routes/variantRout");
const variantNameRout = require("./routes/variantNameRout");
const customarRoute = require('./routes/customarRoute');


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
app.use("/api/role", roleRout);
app.use("/api/user", userRout);
app.use("/api/variant", variantRout);
app.use("/api/variant2", variantNameRout);
app.use("/api/customars",customarRoute);


const PORT =process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  console.log(`app running on port ${PORT}`);
});
