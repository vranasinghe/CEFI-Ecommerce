require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const { Resend } = require('resend');
const nodemailer = require('nodemailer');

const resend = new Resend(process.env.RESEND_API_KEY);
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  }
});

async function runTests() {
  console.log('--- Testing Resend ---');
  try {
    const res = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: process.env.ADMIN_EMAIL || 'ceylonecofreshinfinity@gmail.com',
      subject: 'CEFI Resend Test',
      html: '<p>Testing Resend from backend</p>'
    });
    console.log('Resend OK:', res.data?.id || res.error);
  } catch (e) {
    console.error('Resend Exception:', e.message);
  }

  console.log('--- Testing Gmail SMTP (Nodemailer) ---');
  try {
    const info = await transporter.sendMail({
      from: `"CEFI Store" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: 'CEFI SMTP Test',
      text: 'Testing Gmail SMTP'
    });
    console.log('SMTP OK:', info.messageId);
  } catch (e) {
    console.error('SMTP Exception:', e.message);
  }
}

runTests();
