#!/usr/bin/env node

const readlineSync = require("readline-sync");
const core = require("./src/core");
const {
  "define": { value: define },
  "begin-module": { value: beginModule }
} = core;
const parse = require("./src/parse");
const check = require("./src/check");
const generate = require("./src/generate");

function compile(js) {
  return generate(check(parse(js)));
}

function formatError(e) {
  if (e.location) {
    const message = e.message;
    const { src, start: { line, column } } = e.location;
    if (src && line && column) {
      // TODO append line like 42:
      // TODO file
      return [message, line, "^".padStart(column)].join("\n");
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
  while(true) {
    const src = readlineSync.question(">");
    try {
      const ast = parse(src);
      const checkedAST = check(ast);
      const type = checkedAST.typeValue;
      const js = generate(checkedAST);
      const res = eval(js);
      console.log(`${res} : ${type}`);
    }
    catch(e) {
      console.error(formatError(e));
    }
  }
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
