"use strict";

var keychain = require('./password-manager').keychain();

keychain.init('daniel007');

keychain.set('www.example.com', 'password');
keychain.set('www.google.com', 'password');

var pass1 = keychain.get('www.example.com');
var pass2 = keychain.get('www.google.com');

console.log(pass1 === pass2);

console.log(keychain.dump()[0]);
