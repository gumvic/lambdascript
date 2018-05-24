#!/usr/bin/env node

const cli = require("yargs");

const { readFile } = require("fs-extra");

const { formatError } = require("./src/utils");
const build = require("./src/build");

const defaultOptions = require("./src/defaultOptions");

function outputError(error, context) {
  return formatError(error, context).then(console.error);
}

function outputSuccess(context) {
  console.log("Done.");
}

function _build(srcDir, distDir, options) {
  const context = { srcDir, distDir };
  return build(srcDir, distDir, options).then(
    () => outputSuccess(context),
    error => outputError(error, context).then(() => process.exit(1)));
}

function run() {
  const args = cli
    .usage("monada <src> <dist>")
    .option("o", {
      alias: "opts",
      default: null
    }).parse(process.argv);
  const [$0, $1, srcDir, distDir] = args._;
  if (!srcDir) {
    throw "src is required";
  }
  if (!distDir) {
    throw "dist is required";
  }
  if args.opts {
    return readFile(args.opts, "utf8")
      .then(options => _build(srcDir, distDir, JSON.parse(options)));
  }
  else {
    return _build(srcDir, distDir, defaultOptions);
  }
}

run();
