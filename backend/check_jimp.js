const { Jimp } = require(__dirname + '/node_modules/jimp');
const j = new Jimp({ width: 1, height: 1 });
const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(j));
console.log(methods.join('\n'));
