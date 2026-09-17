const fs = require('fs');
['backend/lib/magic-bytes.js', 'backend/lib/image-processor.js'].forEach(f => {
  let code = fs.readFileSync(f, 'utf8');
  code = code.replace(/\\`/g, '`').replace(/\\\$/g, '$');
  fs.writeFileSync(f, code);
});
console.log('Fixed syntax errors');
