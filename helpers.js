var lib = require("./lib");

function helpers() {
	helpers = {}

	helpers.get_keys_from_password = function(password, salt) {
		var raw_key = lib.KDF(password, salt);
		var keys = []

		keys.push(lib.bitarray_slice(raw_key, 0, 128));
		keys.push(lib.bitarray_slice(raw_key, 128, 256));

		return keys;
	}

	return helpers;
}

module.exports = helpers();
