const { check, body, param } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");


exports.createCustomarVlaidator = [
    check('name')
        .notEmpty().withMessage('The name can not be empty')
        .isLength({min:3}).withMessage('The name is too short')
        .isLength({max:30}).withMessage('The name is too long'),
    check('phoneNumber')
        .optional()
        .isMobilePhone(["tr-TR"]).withMessage("Invalid phone number Only accepted turkey phone numbers"),
    check('email')
        .notEmpty().withMessage('The email can not be empty')
        .isEmail().withMessage('Invalid email address')

        .custom((val)=>findOne({email:val}).then((customar)=>{
                if(customar){
                    return Promise.reject(new Error ('Email already in customar'));
                }
            })
        ),

    validatorMiddleware,

];