require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const { Resend } = require('resend');

console.log('RESEND_API_KEY set:', !!process.env.RESEND_API_KEY);
console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL);
console.log('RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL);

const resend = new Resend(process.env.RESEND_API_KEY);

async function test() {
  try {
    const res = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: process.env.ADMIN_EMAIL || 'ceylonecofreshinfinity@gmail.com',
      subject: 'CEFI Resend Test Email',
      html: '<p>Testing Resend Email from CEFI Ecommerce System</p>'
    });
    console.log('Resend Response:', res);
  } catch (e) {
    console.error('Resend Error:', e);
  }
}

test();
