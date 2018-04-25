#!/usr/bin/env node

const cli = require("commander");

const build = require("./src/build");
const Error = require("./src/error");

function formatError(error) {
  if (!(error instanceof Error)) {
    error = error ?
      new Error(error.toString()) :
      new Error("Unknown error");
  }
  return `${error.location.file}:${error.location.start.line}:${error.location.start.column}: ${error.message}`;
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
  build(src, distDir).then(
    () => outputSuccess("Done."),
    outputError);
}

run();
