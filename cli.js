#!/usr/bin/env node

const { promisify } = require("util");

const { resolve: resolvePromise } = require("bluebird");

const cli = require("commander");
const { join: joinPath } = require("path");
const readlineSpecific = promisify(require("readline-specific").oneline);

const build = require("./src/build");
const Error = require("./src/error");

function formatError(error, { srcDir }) {
  if (!(error instanceof Error)) {
    error = error ?
      new Error(error.toString()) :
      new Error("Unknown error");
  }
  const { message, location: { file, start: { line, column } } } = error;
  const description = `${file || "?"}:${line || "?"}:${column || "?"}: ${message || "?"}`;
  if (file && line && column) {
    return readlineSpecific(joinPath(srcDir, file), line).then(line => [
      description,
      line,
      "^".padStart(column)
    ].join("\n"));
  }
  else {
    return resolvePromise(description);
  }
}

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
