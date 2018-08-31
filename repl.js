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
  //repl(`print(42)`);
  //repl(`print(42 + null)`);
  //repl(`x = 42`);
  //repl(`print(x)`);
  repl(`
    let
      x = case
        when true + 1: (==)
        else (+)
      end
    in
      x(x, x)
    end`);
  /*repl(`
    let
      x = print(42)
    in
      print(x(x))
    end`);*/
  //repl(`print(id)(print)`);
}

run();
