#!/usr/bin/env node

const { EOL } = require("os");
const init = require("./src/core");

function formatError(e, src) {
  if (e.location) {
    const line = e.location.start.line - 1;
    const column = e.location.start.column;
    return [e.message, src.split(EOL)[line], "^".padStart(column)].join(EOL);
  }
  else {
    return e.stack;
  }
}

function repl(src) {
  try {
    console.log(compile(src));
  }
  catch(e) {
    console.log(formatError(e, src));
  }
}

function run() {
  init();
  repl(`id(x) -> x`)
  repl(`add = fn(x, y) -> x + y`);
  repl(`x = 42`);
  repl(`y = 42`);
  repl(`add(x, id(y))`);
}

run();
