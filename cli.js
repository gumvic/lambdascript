#!/usr/bin/env node

const { EOL } = require("os");
const { terminal } = require("terminal-kit");
//const core = require("./src/core");
//const { define } = core;
const { compile } = require("./src/compile");

function formatError({ error }) {
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

function formatSuccess({ type, value }) {
  return `${value} : ${type}`;
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
    terminal.inputField((err, input) => {
      terminal(EOL);
      const compiled = compile(input);
      const output = compiled.error ?
        formatError(compiled) :
        formatSuccess(compiled);
      terminal(output);
      terminal(EOL);
      loop();
    });
  }
  loop();
}

function init() {
  //Object.keys(core).forEach((name) => {
    //define(name, core[name]);
  //});
}

function run() {
  init();
  repl();
}

run();
