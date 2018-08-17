#!/usr/bin/env node

const immutable = require("immutable");
const parse = require("./src/parse");
const check = require("./src/check");
const generate = require("./src/generate");

function initEnvironment() {
  global.immutable = immutable;
}

function repl(src) {
  const js =
    generate(
      check(
        parse(src)));
  eval(js);
}

function run() {
  initEnvironment();
  repl("print(42)");
}

run();
