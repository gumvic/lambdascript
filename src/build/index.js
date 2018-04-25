const promise = require("bluebird");

const { parse: parsePath, relative: relativePath, join: joinPath } = require("path");
//const { pathExists, lstat, readFile, writeFile, ensureFile, copy } = require("fs-extra");
const walk = require("walk-promise");
const replaceExt = require("replace-ext");

const parse = require("../parse");
const check = require("../check");
const generate = require("../generate");

const Error = require("../error");
const BuildError = require("./error");

/*function findModule(name, { srcDir, distDir }) {
  const notFound = _ => ({
    type: "external",
    id: name,
    name: name,
    srcPath: name
  });

  const foundMuModule = srcPath => ({
    type: "mu",
    id: srcPath,
    name: name,
    srcPath: srcPath,
    distPath: replaceExt(distPath, ".js")
  });

  const foundJSModule = srcPath => ({
    type: "js",
    id: srcPath,
    name: name,
    srcPath: srcPath,
    distPath: replaceExt(distPath, ".js")
  });

  const findJSModule = srcPath => {
    srcPath = replaceExt(srcPath, ".js");
    return pathExists(srcPath).then(exists => exists ? foundJSModule(srcPath) : notFound(srcPath));
  };

  const findMuModule = srcPath => {
    srcPath = replaceExt(srcPath, ".mu");
    return pathExists(srcPath).then(exists => exists ? foundMuModule(srcPath) : findJSModule(srcPath));
  };

  const srcPath = normalizePath(joinPath(srcDir, name));
  const distPath = normalizePath(joinPath(distDir, name));

  return findMuModule(srcPath);
}

function resolveDepPath({ distPath }, { type, srcPath, distPath: importDistPath }) {
  if (type === "external") {
    return srcPath;
  }
  else {
    const { dir } = parsePath(distPath);
    const { dir: importDir, base: importFile } = parsePath(importDistPath);
    return joinPath(relativePath(dir, importDir), importFile);
  }
}

function buildMuModule(module, context) {
  const { srcPath, distPath } = module;
  return readFile(srcPath, "utf8")
    .then((src) => {
      // TODO move somewhere
      const defaultImports = [
        {
          type: "import",
          alias: "core",
          module: "core",
          globals: ["join", "isJoin", "bind", "run", "read", "write"]
        }
      ];
      const ast = parse(src);
      ast.imports = defaultImports.concat(ast.imports);
      check(ast);
      const deps = ast.imports
        .map(({ module }) => findModule(module, context));
      return promise
        .all(deps)
        .then(deps => {
          let imported = {};
          deps.forEach(({ id, name }, i) => {
            if (imported[id]) {
              throw new BuildError(`Duplicate import: ${name}`, ast.imports[i].location);
            }
            else {
              imported[id] = true;
            }
          });
          return deps;
        })
        .then(deps => promise.all(deps.map(dep => buildModule(dep, context))))
        .then(deps => {
          deps.forEach((dep, i) => {
            ast.imports[i].module = resolveDepPath(module, dep);
          });
          const js = generate(ast);
          return ensureFile(distPath)
            .then(() => writeFile(distPath, js))
            .then(() => module);
        });
    });
}

function buildJSModule(module, context) {
  const { srcPath, distPath } = module;
  return copy(srcPath, distPath, {
    overwrite: true
  }).then(() => module);
}

function buildExternalModule(module, context) {
  return promise.resolve(module);
}

function buildModule(module, context) {
  if (typeof module === "string") {
    return findModule(module, context)
      .then(module => buildModule(module, context));
  }
  else {
    if (context.builtModules[module.id]) {
      return promise.resolve(module);
    }
    else {
      context.builtModules[module.id] = module;
    }
    let _module = null;
    if (module.type === "mu") {
      _module = buildMuModule(module, context);
    }
    else if (module.type === "js") {
      _module = buildJSModule(module, context);
    }
    else if (module.type === "external") {
      _module = buildExternalModule(module, context);
    }
    else {
      throw new BuildError(`Unknown module type ${module.type}.`);
    }
    return _module.catch(e => {
      if (e instanceof Error) {
        e.location.module = module.name;
      }
      else {
        throw new Error(e.toString(), { module: module.name });
      }
      throw e;
    });
  }
}

function buildPackage(srcDir, distDir) {

}

function build(path, distDir) {
  const { dir: srcDir, base: name } = parsePath(path);
  const context = {
    srcDir: srcDir,
    distDir: distDir,
    builtModules: {}
  };
  return findModule(name, context).then(module => {
    if (module.type !== "mu") {
      throw new BuildError(`Entry .mu module not found: ${module.name}`);
    }
    else {
      return buildModule(module, context);
    }
  });
}*/

function buildMuModule({ file }, { distDir }) {
  return readFile(file, "utf8").then(src => {
    const defaultImports = [
      {
        type: "import",
        alias: "core",
        module: "core",
        globals: ["join", "isJoin", "bind", "run", "read", "write"]
      }
    ];
    const ast = parse(src);
    ast.imports = defaultImports.concat(ast.imports);
    check(ast);
    const js = generate(ast);
    const distFile = joinPath(distDir, file);
    return ensureFile(distFile)
      .then(() => writeFile(distFile, js));
  });
}

function buildJSModule({ file }, { distDir }) {
  const distFile = joinPath(distDir, file);
  return copy(file, distFile, {
    overwrite: true
  });
}

function buildXModule({ file }, { distDir }) {
  const distFile = joinPath(distDir, file);
  return copy(file, distFile, {
    overwrite: true
  });
}

function buildModule(module, context) {
  function build(module, context) {
    switch(module.type) {
      case "mu": return buildMuModule(module, context);
      case "js": return buildJSModule(module, context);
      default: return buildXModule(module, context);
    }
  }
  return build(module, context)
    .catch(e => {
      if (e instanceof Error) {
        e.location.file = module.file;
      }
      else {
        throw new Error(e.toString(), { file: module.file });
      }
      throw e;
    });
}

function buildPackage(srcDir, distDir) {
  const context = { srcDir, distDir };
  return walk(srcDir)
    .then(files => files.map(({ root, name }) => relativePath(srcDir, `${root}/${name}`)))
    .then(files => promise.all(files.map(file => buildModule(file, context))));
}

function build(srcDir, distDir) {
  return buildPackage(srcDir, distDir);
}

module.exports = build;
