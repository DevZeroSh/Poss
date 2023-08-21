const path = require("path");

const express = require("express");
const dotenv = require("dotenv");

const dbContacion = require("./config/database");
const productRout = require("./routes/productRout");
const brandRout = require("./routes/brandRout");
const categoryRout = require("./routes/categoryRout");
const roleRout = require("./routes/roleRout");
const userRout = require("./routes/userRout");
const cors = require("cors");
const morgan = require("morgan");

dotenv.config({ path: "config.env" });

const app = express();
app.use(express.json());
app.use(cors());

dbContacion();
app.use(express.static(path.join(__dirname, "uploads")));
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
  console.log(`mode: ${process.env.NODE_ENV}`);
}

app.use("/api/product", productRout);
app.use("/api/brand", brandRout);
app.use("/api/category", categoryRout);
app.use("/api/role", roleRout);
app.use("/api/user", userRout);

const p = 8000;
const server = app.listen(p, () => {
  console.log(`app running on port ${p}`);
});
