const nodemailer = require("nodemailer");

//Nodemailer
const sendEmail = async (options) => {
  try {
    //1- Create transporter (service thatll send email like "gmail","Mailgun","Mialtrap",...)
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT, // if secure false port = 587, if true port = 465
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    //2-Define email options (Like from , to , subject, email, email content)
    const mailOpts = {
      from: "SmartPos",
      to: options.email,
      subject: options.subject,
      text: options.message,
    };

    //3-Send email
    await transporter.sendMail(mailOpts);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

module.exports = sendEmail;
