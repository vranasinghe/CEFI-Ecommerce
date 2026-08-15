const http = require('http');

const orderPayload = JSON.stringify({
  customer: {
    name: 'Venuja Rana',
    email: 'venujarana26@gmail.com',
    phone: '+94 71 463 4485',
    address: '80/44/c Panaluwa, Watareka',
    city: 'Colombo',
    postalCode: '10600',
    country: 'Sri Lanka'
  },
  items: [
    { name: 'Soursop Flavored Black Tea', quantity: 2 },
    { name: 'Pure Ceylon Cinnamon Quills (ALBA Grade)', quantity: 5 }
  ],
  paymentMethod: 'Direct Export Order Request',
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
