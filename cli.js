#!/usr/bin/env node

/*const promise = require("bluebird");

const path = require("path");
const fs = require("fs-extra");
const replaceExt = require("replace-ext");
const cli = require("commander");

const compile = require("./src/compile");*/

const cli = require("commander");
const build = require("./src/build");

function formatError(error) {
  // TODO
  if (error && error.location) {
    return `${error.message} at ${error.location.start.line}:${error.location.start.column}`;
  }
  else {
    return error;
  }
}

function outputError(error) {
  console.log("\x1b[31m", formatError(error), "\x1b[0m");
}

function outputSuccess(message) {
  console.log("\x1b[32m", message, "\x1b[0m");
}

function run() {
  cli.parse(process.argv);
  const src = cli.args[0];
  const distDir = cli.args[1];
  build(src, distDir)
    .then(() => outputSuccess("Done."))
    .catch(e => outputError(e));
}

run();
