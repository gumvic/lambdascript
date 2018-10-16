#!/usr/bin/env node

const { EOL } = require("os");
const { terminal } = require("terminal-kit");
const { parse } = require("./src/parse");
const { check } = require("./src/check");
const { generate } = require("./src/generate");
const { eval } = require("./src/eval");
const { load } = require("./src/meta");

function formatError(error) {
  if (error.location) {
    const message = error.message;
    const { src, start: { line, column } } = error.location;
    if (src && line && column) {
      return [message, line, "^".padStart(column)].join(EOL);
    }
    else {
      return message;
    }
  }
  else {
    return error.stack;
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
      terminal(EOL);
      try {
        terminal(eval(generate(check(parse(src)))));
      }
      catch(e) {
        terminal(formatError(e));
      }
      terminal(EOL);
      loop();
    });
  }
  loop();
}

function init() {
  // TODO this is awful
  load(__dirname);
}

function run() {
  init();
  repl();
}

run();
