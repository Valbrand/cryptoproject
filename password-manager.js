"use strict";


/********* External Imports ********/

var lib = require("./lib");
var helpers = require("./helpers");

var KDF = lib.KDF,
HMAC = lib.HMAC,
SHA256 = lib.SHA256,
setup_cipher = lib.setup_cipher,
enc_gcm = lib.enc_gcm,
dec_gcm = lib.dec_gcm,
bitarray_slice = lib.bitarray_slice,
bitarray_to_string = lib.bitarray_to_string,
string_to_bitarray = lib.string_to_bitarray,
bitarray_to_hex = lib.bitarray_to_hex,
hex_to_bitarray = lib.hex_to_bitarray,
bitarray_to_base64 = lib.bitarray_to_base64,
base64_to_bitarray = lib.base64_to_bitarray,
byte_array_to_hex = lib.byte_array_to_hex,
hex_to_byte_array = lib.hex_to_byte_array,
string_to_padded_byte_array = lib.string_to_padded_byte_array,
string_to_padded_bitarray = lib.string_to_padded_bitarray,
string_from_padded_byte_array = lib.string_from_padded_byte_array,
string_from_padded_bitarray = lib.string_from_padded_bitarray,
random_bitarray = lib.random_bitarray,
bitarray_equal = lib.bitarray_equal,
bitarray_len = lib.bitarray_len,
bitarray_concat = lib.bitarray_concat,
dict_num_keys = lib.dict_num_keys;


/********* Implementation ********/


var keychain = function() {
  // Class-private instance variables.
  var priv = {
    secrets: { /* Your secrets here */ },
    data: { /* Non-secret data here */ }
  };

  // Maximum length of each record in bytes
  var MAX_PW_LEN_BYTES = 64;
  var SALT_LENGTH = 512;

  // Flag to indicate whether password manager is "ready" or not
  var ready = false;

  var keychain = {};

  /**
  * Creates an empty keychain with the given password. Once init is called,
  * the password manager should be in a ready state.
  *
  * Arguments:
  *   password: string
  * Return Type: void
  */
  keychain.init = function(password) {
    try {
      priv.data.key_salt = random_bitarray(256);
      priv.data.pwd_check = bitarray_to_hex(
        SHA256(string_to_bitarray(password))
      );
      priv.data.kvs = {};

      setup_secret_info(password, priv.data.key_salt);

      priv.data.key_salt = bitarray_to_hex(priv.data.key_salt);
    } catch (e) {
      throw new Error(e);
    }
  };

  /**
  * Loads the keychain state from the provided representation (repr). The
  * repr variable will contain a JSON encoded serialization of the contents
  * of the KVS (as returned by the save function). The trusted_data_check
  * is an *optional* SHA-256 checksum that can be used to validate the
  * integrity of the contents of the KVS. If the checksum is provided and the
  * integrity check fails, an exception should be thrown. You can assume that
  * the representation passed to load is well-formed (e.g., the result of a
  * call to the save function). Returns true if the data is successfully loaded
  * and the provided password is correct. Returns false otherwise.
  *
  * Arguments:
  *   password:           string
  *   repr:               string
  *   trusted_data_check: string
  * Return Type: boolean
  */
  keychain.load = function(password, repr, trusted_data_check) {
    try {
      var received_obj = JSON.parse(repr);
      var hashed_pwd = bitarray_to_hex(SHA256(string_to_bitarray(password)));
      var result = false;

      if (received_obj.pwd_check == hashed_pwd) {
        var salt = hex_to_bitarray(received_obj.key_salt);

        result = true;

        setup_secret_info(password, salt);
        priv.data = received_obj;
      }

      return result;
    } catch(e) {
      throw new Error(e);
    }
  };

  /**
  * Returns a JSON serialization of the contents of the keychain that can be
  * loaded back using the load function. The return value should consist of
  * an array of two strings:
  *   arr[0] = JSON encoding of password manager
  *   arr[1] = SHA-256 checksum
  * As discussed in the handout, the first element of the array should contain
  * all of the data in the password manager. The second element is a SHA-256
  * checksum computed over the password manager to preserve integrity. If the
  * password manager is not in a ready-state, return null.
  *
  * Return Type: array
  */
  keychain.dump = function() {
    try {
      return [
        JSON.stringify(priv.data, null, 2),
        null
      ];
    } catch(e) {
      throw new Error(e);
    }
  }

  /**
  * Fetches the data (as a string) corresponding to the given domain from the KVS.
  * If there is no entry in the KVS that matches the given domain, then return
  * null. If the password manager is not in a ready state, throw an exception. If
  * tampering has been detected with the records, throw an exception.
  *
  * Arguments:
  *   name: string
  * Return Type: string
  */
  keychain.get = require_init(function(name) {
    try {
      var domain_hmac = get_hex_hmac(name);
      var result = null;

      if (priv.data.kvs.hasOwnProperty(domain_hmac)) {
        var encrypted_entry = hex_to_bitarray(priv.data.kvs[domain_hmac]);
        var decrypted_entry = dec_gcm(
          priv.secrets.internal_pwd_aes,
          encrypted_entry
        );

        result = string_from_padded_bitarray(
          decrypted_entry,
          MAX_PW_LEN_BYTES
        );
      }

      return result;
    } catch(e) {
      throw new Error(e);
    }
  });

  /**
  * Inserts the domain and associated data into the KVS. If the domain is
  * already in the password manager, this method should update its value. If
  * not, create a new entry in the password manager. If the password manager is
  * not in a ready state, throw an exception.
  *
  * Arguments:
  *   name: string
  *   value: string
  * Return Type: void
  */
  keychain.set = require_init(function(name, value) {
    try {
      var domain_hmac = get_hex_hmac(name);
      var padded_pwd = string_to_padded_bitarray(value, MAX_PW_LEN_BYTES);

      var encrypted_pwd = enc_gcm(
        priv.secrets.internal_pwd_aes,
        padded_pwd
      );

      priv.data.kvs[domain_hmac] = bitarray_to_hex(encrypted_pwd);
    } catch (e) {
      throw new Error(e);
    }
  });

  /**
  * Removes the record with name from the password manager. Returns true
  * if the record with the specified name is removed, false otherwise. If
  * the password manager is not in a ready state, throws an exception.
  *
  * Arguments:
  *   name: string
  * Return Type: boolean
  */
  keychain.remove = require_init(function(name) {
    try {
      var domain_hmac = get_hex_hmac(name);
      var result = false;

      if (priv.data.kvs.hasOwnProperty(domain_hmac)) {
        delete priv.data.kvs[domain_hmac];
        result = true;
      }

      return result;
    } catch(e) {
      throw new Error(e);
    }
  });

  function setup_secret_info(password, salt) {
    var keys =
      helpers.get_keys_from_password(password, salt);

    priv.secrets.hmac_key = keys[0];
    priv.secrets.aes_key = keys[1];

    priv.secrets.internal_pwd_aes = setup_cipher(keys[1]);
  }

  function get_hex_hmac(data) {
    return bitarray_to_hex(HMAC(priv.secrets.hmac_key, data));
  }

  function require_init(fn) {
    function wrapped_fn() {
      if (!priv.data.hasOwnProperty("kvs")) {
        throw "The password manager hasn't been initialized yet!";
      }

      return fn.apply(keychain, arguments);
    }

    return wrapped_fn;
  }

  return keychain;
}

module.exports.keychain = keychain;
