"use strict";

var lib = require('../lib');

function experiment() {
	var experiment_env = {},
			last_queries = {},
			master_password = "MASTERPASSWORD",
			WORLD_BIT, keychain, can_submit_dump = false;

	function init() {
		console.log("Inicializando ambiente do experimento...");

		WORLD_BIT = init_world_bit();
		keychain = require('../password-manager').keychain();

		keychain.init(master_password);
		keychain.set("www.google.com", "googlepassword");
		keychain.set("www.facebook.com", "facebookpassword");
		keychain.set("www.quora.com", "googlepassword");
	}

	function init_world_bit() {
		var rnd = lib.random_bitarray(32);

		return rnd[0] & 1;
	}

	/**
	* Query 1
	*/
	experiment_env.add_to_database = function (domain, passwords) {
		can_submit_dump = false;

		last_queries[domain] = passwords;

		return keychain.set(domain, passwords[WORLD_BIT]);
	}

	/**
	* Query 2
	*/
	experiment_env.delete_from_database = function(domain) {
		can_submit_dump = false;

		delete last_queries[domain];
		return keychain.remove(domain);
	}

	/**
	* Query 3
	*/
	experiment_env.query_data_serialization = function() {
		can_submit_dump = true;

		return keychain.dump();
	}

	/*
	* Query 3 - parte 2
	*/
	experiment_env.submit_modified_dump = function(modified_dump, data_check) {
		if (can_submit_dump) {
			can_submit_dump = false;

			return keychain.load(master_password, modified_dump, data_check);
		}
	}

	/**
	* Query 4
	*/
	experiment_env.query_domain_data = function(domain) {
		can_submit_dump = false;

		if (last_queries[domain] === undefined ||
				last_queries[domain][0] !== last_queries[domain][1]) {
			throw "Consulta não permitida segundo as regras do experimento.";
		}

		return keychain.get(domain);
	}

	init();

	return experiment_env;
}

module.exports = experiment();