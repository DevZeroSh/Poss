const axios = require("axios");
const checkUserSubsicreber = async (req, res, next) => {
    try {
        //make axois req to get dbName from subscribers server
        //1-check user from main subscribers server
        const response = await axios.get("http://ec2-16-171-21-186.eu-north-1.compute.amazonaws.com:4000/api/allusers/", { params: { email: req.body.email } });
        if (response.data.status === "true") {
            let dbName = response.data.user[0].subscribtion.dbName;
            let subscribtionId = response.data.user[0].subscribtion._id;

            //req.body.subscribtionId = subscribtionId;
            //req.body.databaseName = dbName;
            req.query = { ...req.query, databaseName: dbName, subscribtionId: subscribtionId };

            next();
        } else {
            return next(new ApiError("authService.js", 401));
        }
    } catch (error) {
        res.status(500).json({ status: "false", error: `Internal Server Error ${error}` });
    }
};

module.exports = { checkUserSubsicreber };
