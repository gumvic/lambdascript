const { resolve: resolvePath, join: joinPath } = require("path");
const { readFile, writeFile, ensureFile } = require("fs-extra");
const replaceExt = require("replace-ext");
const { map: mapPromise } = require("bluebird");

const parse = require("../parse");
const check = require("../check");
const generate = require("../generate");

const BuildError = require("../error");

class Context {
  constructor(distDir) {
    this.distDir = distDir;
  }
}

function compile(src, context) {
  const ast = parse(src);
  //mapPromise(ast.imports.map(({ name }) => build(name.name, context)));
  return generate(check(ast));
}

// TODO JS modules (self contained module only, no local dependencies, global are fine)
// TODO dependency loops
// TODO differentiate between local and global modules
function build(moduleName, context) {
  const srcFile = resolvePath(moduleName);
  const distFile = resolvePath(replaceExt(joinPath(context.distDir, moduleName), ".js"));
  return ensureFile(distFile)
    .then(() => readFile(srcFile, "utf8"))
    .then((src) => compile(src, context))
    .then((js) => writeFile(distFile, js))
    //.then(() => require(distFile))
    .catch((e) => {
      if (e.location && !e.location.file) {
        e.location.file = srcFile;
      }
      throw e;
    });
}

module.exports = function(srcFile, distDir) {
  return build(srcFile, new Context(distDir));
}
