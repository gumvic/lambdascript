#!/usr/bin/env node

//const cli = require("commander");
const cli = require("yargs");

const { formatError } = require("./src/utils");
const build = require("./src/build");

const defaultOptions = require("./src/defaultOptions");

function outputError(error, context) {
  return formatError(error, context).then(console.error);
}

function outputSuccess(context) {
  console.log("Done.");
}

function run() {
  const args = cli
    .usage("monada <src> <dist>")
    .option("o", {
      alias: "opts",
      default: null
    }).parse(process.argv);
  const [$0, $1, srcDir, distDir] = args._;
  let opts = args.opts ? JSON.parse(args.opts) : defaultOptions;
  if (!srcDir) {
    throw "src is required";
  }
  if (!distDir) {
    throw "dist is required";
  }
  const context = { srcDir, distDir };
  build(srcDir, distDir, opts || defaultOptions).then(
    () => outputSuccess(context),
    error => outputError(error, context));
}

run();
