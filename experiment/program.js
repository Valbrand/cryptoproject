"use strict";

(function () {
  var readline = require('readline');
  var experiment_env = require('./experiment-wrapper');
  var fs = require('fs');
  var can_submit_dump = false;
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  });

  function sendPrompt() {
    console.log();
    console.log("====================");
    console.log("Submeta uma das seguintes consultas:");

    printQueryOneDescription();
    printQueryTwoDescription();
    printQueryThreeDescription();
    printQueryFourDescription();

    console.log("Para sair, digite 'quit'");
    console.log("====================");
    console.log();

    rl.prompt();
  }

  function printQueryOneDescription() {
    console.log("Adicionar ao banco:");
    console.log("Exemplo: q1 <domínio> <senha_0> <senha_1>");
  }

  function printQueryTwoDescription() {
    console.log("Remover do banco:");
    console.log("Exemplo: q2 <domínio>");
  }

  function printQueryThreeDescription() {
    if (!can_submit_dump) {
      console.log("Obter serialização do banco:");
      console.log("(O dump será armazenado no arquivo dump.json)");
      console.log("Exemplo: q3");
    } else {
      console.log("Submeter serialização do banco:");
      console.log("(O dump será recuperado do arquivo dump.json)");
      console.log("Exemplo: q3 <senha>");
    }
  }

  function printQueryFourDescription() {
    console.log("Recuperar do banco:");
    console.log("Exemplo: q4 <domínio>");
  }

  function processQueryOne(domain, password_0, password_1) {
    if (domain === undefined ||
        password_0 === undefined ||
        password_1 === undefined) {
      throw "Query inválida!";
    }

    can_submit_dump = false;

    return experiment_env.add_to_database(domain, [password_0, password_1]);
  }

  function processQueryTwo(domain) {
    if (domain === undefined) {
      throw "Query inválida!";
    }

    can_submit_dump = false;

    return experiment_env.delete_from_database(domain);
  }

  function retrieveDump() {
    var dump = experiment_env.query_data_serialization();
    var fileDescriptor = fs.openSync("dump.json", "w");

    can_submit_dump = true;

    var file_contents = JSON.stringify({
      dump: JSON.parse(dump[0]),
      data_check: dump[1]
    }, null, 2);

    fs.writeSync(fileDescriptor, file_contents);

    return file_contents;
  }

  function submitDump() {
    can_submit_dump = false;

    var file_contents = JSON.parse(fs.readFileSync('dump.json'));

    return experiment_env.submit_modified_dump(
        JSON.stringify(file_contents.dump), file_contents.data_check
    );
  }

  function processQueryFour(domain) {
    if (domain === undefined) {
      throw "Query inválida!";
    }

    can_submit_dump = false;

    return experiment_env.query_domain_data(domain);
  }

  function CLI(line) {
    var args = line.split(" ");
    var command = args[0];
    var result;

    args = args.slice(1);

    try {
      if (command === "q1") {
        processQueryOne.apply(null, args);

        console.log("Inserção realizada!");
      } else if (command === "q2") {
        result = processQueryTwo.apply(null, args);

        console.log("Resultado: ", result);
      } else if (command === "q3") {
        if (can_submit_dump) {
          result = submitDump.apply(null, args);

          if (result) {
            console.log("Banco carregado com sucesso!");
          } else {
            console.log("Um erro ocorreu no carregamento do banco serializado.");
          }
        } else {
          result = retrieveDump();

          if (result) {
            console.log("Banco serializado salvo no arquivo dump.json");
          }
        }
      } else if (command === "q4") {
        result = processQueryFour.apply(null, args);

        if (result) {
          console.log("Entrada '", args[0], "' removida com sucesso do banco de dados.");
        } else {
          console.log("Falha ao remover a entrada '", args[0], "' do banco de dados.");
        }
      } else if (command === "quit") {
        process.exit();
      } else {
        console.log("Comando inválido!!");
      }
    } catch (e) {
      console.log(e);
    } finally {
      sendPrompt();
    }
  }

  rl.setPrompt("> ");
  sendPrompt();

  rl.on('line', CLI);
})();