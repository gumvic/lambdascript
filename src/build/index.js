const { normalize: normalizePath, resolve: resolvePath, relative: relativePath, join: joinPath, parse: parsePath, dirname } = require("path");
const { readFile, writeFile, ensureFile, copy: copyFile } = require("fs-extra");
const replaceExt = require("replace-ext");
const walk = require("walk-promise");
const { resolve: resolvePromise, map: mapPromise, try: tryPromise } = require("bluebird");

const parse = require("../parse");
const check = require("../check");
const generate = require("../generate");

const { tFromValue } = require("monada-core");

const BuildError = require("../error");

const CORE_IMPORT = {
  type: "import",
  module: {
    name: "monada-core"
  },
  kind: "all"
};

class Context {
  constructor(srcDir, distDir) {
    this.srcDir = resolvePath(srcDir);
    this.distDir = resolvePath(distDir);
    this.cached = {};
  }

  cache(module) {
    return this.cached[module.name] = module;
  }

  getCached(name) {
    return this.cached[name];
  }
}

function readMonadaModule(file, context) {
  const distFile = joinPath(context.distDir, relativePath(context.srcDir, file));
  return readFile(file, "utf8")
    .then((src) => {
      const ast = parse(src);
      // TODO should CORE_IMPORT be injected here?
      ast.imports.unshift(CORE_IMPORT);
      const name = ast.name.name;
      return {
        name,
        type: "monada",
        ast,
        srcFile: file,
        distFile: replaceExt(distFile, ".js")
      };
    }).catch((e) => {
      if (e.location && !e.location.file) {
        e.location.file = file;
      }
      throw e;
    });
}

function readJSModule(file, context) {
  return resolvePromise({
    name: distFile,
    type: "js",
    srcFile: file,
    distFile: joinPath(context.distDir, relativePath(context.srcDir, file))
  });
}

function readModule(file, context) {
  return tryPromise(() => {
    const { ext } = parsePath(file);
    switch(ext) {
      case ".monada": return readMonadaModule(file, context);
      case ".js": return readJSModule(file, context);
      default: throw new BuildError(`Can't read file ${file}`);
    }
  }).then((module) => context.cache(module));
}

function findModule(name, context) {
  return resolvePromise(
    context.getCached(name) ||
    context.cache({
      name,
      type: "external"
    }));
}

// TODO refactor
function adjustMonadaModuleImports(module, context) {
  const imports = module.ast.imports;
  return mapPromise(imports, (_import) => {
    const moduleName = _import.module.name;
    return loadModule(moduleName, context).then(({ name, distFile, loaded }) => {
      _import.module.name = distFile ?
        relativePath(module.distFile, distFile) :
        name;
      _import.$module = loaded.$monada ?
        Object.keys(loaded)
          .filter((key) => key !== "$monada")
          .reduce((_loaded, key) => ({ ..._loaded, [key]: loaded[key] }), {}) :
        Object.keys(loaded)
          .reduce((_loaded, key) => ({ ..._loaded, [key]: { type: tFromValue(loaded[key]), value: loaded[key] } }), {});
      return _import;
    });
  }).then((imports) => {
    module.ast.imports = imports;
    return module;
  });
}

function buildMonadaModule(module, context) {
  return ensureFile(module.distFile)
    .then(() => adjustMonadaModuleImports(module, context))
    .then(({ ast }) => generate(check(ast)))
    .then((js) => writeFile(module.distFile, js))
    .then(() => ({ ...module, built: true }))
    .catch((e) => {
      if (e.location) {
        e.location.file = e.location.file || module.srcFile;
      }
      throw e;
    });
}

function buildJSModule(module, context) {
  return copy(module.srcFile, module.distFile, {
    overwrite: true
  }).then(() => ({
    ...module,
    built: true
  }));
}

function buildExternalModule(module, context) {
  return resolvePromise({
    ...module,
    built: true
  });
}

function buildModule(name, context) {
  return findModule(name, context)
    .then((module) => {
      if (module.built) {
        return module;
      }
      else {
        switch(module.type) {
          case "monada": return buildMonadaModule(module, context);
          case "js": return buildJSModule(module, context);
          case "external": return buildExternalModule(module, context);
          default: throw new BuildError(`Unknown module type: ${module.type}`);
        }
      }
    })
    .then((module) => context.cache(module));
}

function loadMonadaModule(module, context) {
  return tryPromise(() => ({
    ...module,
    loaded: require(module.distFile)
  }));
}

function loadJSModule(module, context) {
  return tryPromise(() => ({
    ...module,
    loaded: require(module.distFile)
  }));
}

function loadExternalModule(module, context) {
  return tryPromise(() => ({
    ...module,
    loaded: require(module.name)
  }));
}

function loadModule(name, context) {
  return buildModule(name, context)
    .then((module) => {
      if (module.loaded) {
        return module;
      }
      else {
        switch(module.type) {
          case "monada": return loadMonadaModule(module, context);
          case "js": return loadJSModule(module, context);
          case "external": return loadExternalModule(module, context);
          default: throw new BuildError(`Unknown module type: ${module.type}`);
        }
      }
    })
    .then((module) => context.cache(module));
}

// TODO dependency loops
// TODO nice error messages -- transform all exceptions to Error?
// TODO module duplicates
// TODO module importing itself
// TODO a.monada imports b.monada which imports c.monada -- build will crash because loadMonadaModule can't just require
function build(context) {
  return walk(context.srcDir)
    .then((files) => files.map(({ root, name }) => joinPath(root, name)))
    .then((files) => mapPromise(files, (file) => readModule(file, context)))
    .then((modules) => mapPromise(modules, (module) => buildModule(module.name, context)));
}

module.exports = function(srcDir, distDir) {
  srcDir = resolvePath(srcDir);
  distDir = resolvePath(distDir);
  return build(new Context(srcDir, distDir));
}
