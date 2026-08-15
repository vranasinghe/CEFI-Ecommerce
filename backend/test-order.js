const http = require('http');

const orderPayload = JSON.stringify({
  customer: {
    name: 'Test Customer',
    email: 'ceylonecofreshinfinity@gmail.com',
    phone: '+94 77 123 4567',
    address: '80/44/c Panaluwa, Watareka',
    city: 'Colombo',
    postalCode: '10600',
    country: 'Sri Lanka'
  },
  items: [
    { name: 'Ceylon Cinnamon', quantity: 2, price: 12.50 },
    { name: 'Rambutan', quantity: 1, price: 8.00 }
  ],
  total: 33.00,
  paymentMethod: 'Direct Email Order',
  targetEmail: 'ceylonecofreshinfinity@gmail.com'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/orders',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(orderPayload)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Backend Response:', data);
  });
});

req.on('error', (err) => console.log('Request error:', err.message));
req.write(orderPayload);
req.end();
