#!/usr/bin/env node

const { EOL } = require("os");
const { terminal } = require("terminal-kit");
const core = require("./src/core");
const {
  "define": { value: define },
  "begin-module": { value: beginModule }
} = core;
const parse = require("./src/parse");
const check = require("./src/check");
const generate = require("./src/generate");

function formatError(e) {
  if (e.location) {
    const message = e.message;
    const { src, start: { line, column } } = e.location;
    if (src && line && column) {
      // TODO append line like 42:
      // TODO file
      return [message, line, "^".padStart(column)].join(EOL);
    }
    else {
      return message;
    }
  }
  else {
    return e.stack;
  }
}

function repl() {
  terminal.on("key", (key) => {
    if (key === "CTRL_C") {
      terminal(EOL);
      process.exit();
    }
  });
  function loop() {
    terminal("> ");
    terminal.inputField((err, src) => {
      try {
        terminal(EOL);
        const ast = parse(src);
        const checkedAST = check(ast);
        const type = checkedAST.typeValue;
        const js = generate(checkedAST);
        const res = eval(js);
        terminal(`${res} : ${type}`);
      }
      catch(e) {
        terminal(formatError(e));
      }
      finally {
        terminal(EOL);
        loop();
      }
    });
  }
  loop();
}

function init() {
  beginModule("repl");
  Object.keys(core).forEach((name) => {
    define(name, core[name]);
  });
}

function run() {
  init();
  repl();
}

run();
