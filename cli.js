#!/usr/bin/env node

const cli = require("commander");

const { formatError } = require("./src/utils");
const build = require("./src/build");

function outputError(error, context) {
  return formatError(error, context).then(console.error);
}

function outputSuccess(context) {
  console.log("Done.");
}

function run() {
  cli.parse(process.argv);
  const srcDir = cli.args[0];
  const distDir = cli.args[1];
  const context = { srcDir, distDir };
  build(srcDir, distDir).then(
    () => outputSuccess(context),
    error => outputError(error, context));
}

run();
