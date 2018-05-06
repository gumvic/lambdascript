const { try: tryPromise, map: mapPromise } = require("bluebird");

const { parse: parsePath, relative: relativePath, join: joinPath } = require("path");
const { readFile, writeFile, ensureFile, copy } = require("fs-extra");
const walk = require("walk-promise");
const replaceExt = require("replace-ext");

const parse = require("../parse");
const check = require("../check");
const generate = require("../generate");

const Error = require("../error");
const BuildError = require("./error");

const defaultOptions = require("../defaultOptions");

class Context {
  constructor(srcDir, distDir, options) {
    this.srcDir = srcDir;
    this.distDir = distDir;
    this.options = options;
    this.modules = [];
  }

  checkModule({ type, name, ast }) {
    const duplicate = this.modules[name];
    if (duplicate) {
      throw new BuildError(`Module ${name} is already defined in ${duplicate.file}`);
    }

    if (type === "mu") {
      if (ast.type !== "module") {
        throw new BuildError("Not a module");
      }
      check(ast, this.options);
    }
  }

  addModule(module) {
    this.checkModule(module);
    this.modules[module.name] = module;
  }

  getModule(name) {
    return this.modules[name];
  }
}

function readMuModule(file, context) {
  const { srcDir } = context;
  const srcFile = joinPath(srcDir, file);
  return readFile(srcFile, "utf8").then(src => {
    const ast = parse(src);
    const module = {
      type: "mu",
      file: file,
      name: ast.name,
      ast: ast
    };
    context.addModule(module);
    return module;
  });
}

function readJSModule(file, context) {
  return {
    type: "js",
    file: file
  };
}

function readUnknownModule(file, context) {
  return {
    type: "unknown",
    file: file
  };
}

function readModule(file, context) {
  return tryPromise(() => {
    const { ext } = parsePath(file);
    switch(ext) {
      case ".mu": return readMuModule(file, context);
      case ".js": return readJSModule(file, context);
      default: return readUnknownModule(file, context);
    }
  }).catch(e => {
    if (e instanceof Error) {
      e.location.file = file;
    }
    throw e;
  });
}

function resolveImportPath({ file }, { file: importFile }) {
  const { dir } = parsePath(file);
  const { dir: importDir, base: importBase } = parsePath(importFile);
  return replaceExt(joinPath(relativePath(dir, importDir), importBase), ".js");
}

function normalizeModuleImports(module, context) {
  const { ast: { imports } } = module;
  for(let _import of imports) {
    const importedModule = context.getModule(_import.module);
    if (importedModule) {
      _import.module = resolveImportPath(module, importedModule);
    }
  }
  return module;
}

function buildMuModule(module, context) {
  const { distDir, options } = context;
  const { name, file, ast } = module;
  const distFile = replaceExt(joinPath(distDir, file), ".js");
  return ensureFile(distFile).then(() => {
    const { ast } = normalizeModuleImports(module, context);
    const js = generate(ast, options);
    return writeFile(distFile, js);
  });
    //.then(() => normalizeModuleImports(module, context))
    //.then(({ ast }) => generate())
  /*return ensureFile(distFile)
    .then(() => {
      normalizeModuleImports(module, context);
      return generate(module.ast, options);
    })
    .then(js => writeFile(distFile, js));*/
}

function buildJSModule({ file }, { srcDir, distDir }) {
  const srcFile = joinPath(srcDir, file);
  const distFile = joinPath(distDir, file);
  return copy(srcFile, distFile, {
    overwrite: true
  });
}

function buildUnknownModule({ file }, { srcDir, distDir }) {
  const srcFile = joinPath(srcDir, file);
  const distFile = joinPath(distDir, file);
  return copy(srcFile, distFile, {
    overwrite: true
  });
}

function buildModule(module, context) {
  return tryPromise(() => {
    switch(module.type) {
      case "mu": return buildMuModule(module, context);
      case "js": return buildJSModule(module, context);
      default: return buildUnknownModule(module, context);
    }
  }).catch(e => {
    if (e instanceof Error) {
      e.location.file = module.file;
    }
    throw e;
  });
}

function initContext(srcDir, distDir, options) {
  return new Context (srcDir, distDir, options);
}

function build(srcDir, distDir, options) {
  options = options || defaultOptions;
  const context = initContext(srcDir, distDir, options);
  return walk(srcDir)
    .then(files => files.map(({ root, name }) => relativePath(srcDir, `${root}/${name}`)))
    .then(files => mapPromise(files, file => readModule(file, context)))
    .then(modules => mapPromise(modules, module => buildModule(module, context)));
}

module.exports = build;
