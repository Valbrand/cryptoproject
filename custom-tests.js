var keychain = require('./password-manager').keychain();

keychain.init('daniel007');

keychain.set('www.example.com', 'password');
var examplepass = keychain.get('www.example.com');

console.log(examplepass);