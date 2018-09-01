#!/usr/bin/env node

const { readFile } = require("fs-extra");
const cli = require("yargs");

const { formatError } = require("./src/utils");
const build = require("./src/build");

function outputError(error) {
  return formatError(error).then(console.error);
}

function outputSuccess() {
  console.log("Done.");
}

function run() {
  const args = cli
    .usage("monada <srcFile> <distDir>")
    .parse(process.argv);
  const [$0, $1, srcFile, distDir] = args._;
  if (!srcFile) {
    throw "srcFile is required";
  }
  else if (!distDir) {
    throw "distDir is required";
  }
  else {
    return build(srcFile, distDir).then(outputSuccess, outputError);
  }
}

run();
