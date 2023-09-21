const { check, body,param } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");
const Employee = require('../../models/employeeModel')


//Validator for adding an employee
exports.createEmployeeValidator = [
    check("name")
        .notEmpty().withMessage("The name can not be empty")
        .isLength({min:3}).withMessage("The Name is too short")
        .isLength({max:30}).withMessage("The name is too long"),
    check("email")
        .notEmpty()
        .withMessage("The email can not be empty")
        .isEmail()
        .withMessage("Invalid email address")

        .custom((val) =>
        Employee.findOne({ email: val }).then((employee) => {
            if (employee) {
                return Promise.reject(new Error("Email already in employee"));
            }
        })
        ),
    check("selectedRoles").custom((value)=>{

        // Check if value is an array
        if(value.length === 0){
            return Promise.reject(new Error("You have to select a rol"));
        }
        return true;
        
    }),

    validatorMiddleware,

];

//Validator for adding an employee
exports.updateEmployeeValidator = [

    param("id").isMongoId().withMessage("Invalid employee id"),
    check("name")
        .notEmpty().withMessage("The name can not be empty")
        .isLength({min:3}).withMessage("The Name is too short")
        .isLength({max:30}).withMessage("The name is too long"),
    check("email")
        .notEmpty()
        .withMessage("The email can not be empty")
        .isEmail()
        .withMessage("Invalid email address")

        .custom((val,{req}) =>{
        Employee.findOne({ email: val, _id: { $ne: req.params.id } }).then((employee) => {
            if (employee) {
                return Promise.reject(new Error("Email already in employee"));
            }
        })
    }),
    check("selectedRoles").custom((value)=>{

        // Check if value is an array
        if (!Array.isArray(value)) {
            return Promise.reject(new Error("There is an error in role"));
        }else if(value.length === 0){
            return Promise.reject(new Error("You have to select a rol"));
        }
        return true;
        
    }),

    validatorMiddleware,

];

//Validator to id when get one Employee
exports.getEmployeeVlaidator = [
    check('id').isMongoId().withMessage("Invalid employee id"),
    validatorMiddleware,
];

//Validator to id when delete an Employee
exports.deleteEmployeeVlaidator = [
    check('id').isMongoId().withMessage("Invalid employee id"),
    validatorMiddleware,
];
