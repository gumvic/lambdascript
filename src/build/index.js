const promise = require("bluebird");

const path = require("path");
const fs = require("fs-extra");
const replaceExt = require("replace-ext");

const compile = require("../compile");
const Error = require("./error");

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

function build(src, distDir) {
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
          const { js, deps } = compile(mu);
          fs.ensureFile(dist)
            .then(() => fs.writeFile(dist, js))
            .then(promise.all(deps.map(dep => build(path.join(dir, dep), distDir))));
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

module.exports = build;
