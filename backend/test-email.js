require('dotenv').config({ path: 'c:/Users/LENOVO/OneDrive/Desktop/CEFI Ecommerce/backend/.env' });
const nodemailer = require('nodemailer');

console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS set:', !!process.env.EMAIL_PASS);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify((err, ok) => {
  if (err) {
    console.log('SMTP FAIL:', err.message);
  } else {
    console.log('OK: Gmail SMTP is ready! Sending test email...');
    transporter.sendMail({
      from: `"CEFI Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: 'CEFI Order System - Test Email',
      text: 'If you see this, your Gmail SMTP is working correctly for CEFI order notifications!'
    }, (sendErr, info) => {
      if (sendErr) {
        console.log('Send FAIL:', sendErr.message);
      } else {
        console.log('Email sent successfully! Message ID:', info.messageId);
      }
    });
  }
});
