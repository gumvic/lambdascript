const promise = require("bluebird");

const path = require("path");
const fs = require("fs-extra");
const replaceExt = require("replace-ext");

const parse = require("./parse");
const check = require("./check");
const generate = require("./generate");

class CompilationError {
  constructor(message, location) {
    this.message = message;
    this.location = location || {
      start: {},
      end: {}
    };
  }
}

const defaultImports = [
  {
    type: "import",
    alias: "core",
    module: "muscript-core",
    globals: ["join"]
  }
];

function compileModule(str) {
  const ast = parse(str);
  check(ast);
  const js = generate(ast);
  const deps = defaultImports.concat(ast.imports).map(({ module }) => module);
  return { js, deps };
}

function resolveDep(src) {
  // TODO distinguish between local and global modules
  const resolveJS = src => {
    src = replaceExt(src, ".js");
    return fs.pathExists(src).then(exists => exists ? src : null);
  };

  const resolveMu = src => {
    src = replaceExt(src, ".mu");
    return fs.pathExists(src).then(exists => exists ? src : resolveJS(src));
  };

  const resolveFile = src =>
    fs.pathExists(src).then(exists => exists ? src : resolveMu(src));

  return fs.pathExists(src).then(
    exists => exists ?
      fs.lstat(src).then(stat =>
        stat.isDirectory() ?
          resolveFile(path.join(src, "index")) :
          src) :
      resolveMu(src));
}

function compile(src, distDir) {
  // TODO circular dependencies
  // TODO when provided with a non existing file, it does nothing
  return resolveDep(src).then(src => {
    if (!src) {
      return;
    }
    const { dir, ext } = path.parse(src);
    if (ext === ".mu") {
      const dist = replaceExt(path.join(distDir, src), ".js");
      return fs.readFile(src, "utf8")
        .then((mu) => {
          const { js, deps } = compileModule(mu);
          fs.ensureFile(dist)
            .then(() => fs.writeFile(dist, js))
            .then(promise.all(deps.map(dep => compile(path.join(dir, dep), distDir))));
        });
    }
    else {
      const dist = path.join(distDir, src);
      return fs.copy(src, dist, {
        overwrite: true
      })
    }
  });
}

module.exports = compile;
