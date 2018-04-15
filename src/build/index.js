const { map: mapPromise } = require("bluebird");

const { parse: parsePath, relative: relativePath, join: joinPath } = require("path");
const { readFile, writeFile, ensureFile, copy } = require("fs-extra");
const walk = require("walk-promise");
const replaceExt = require("replace-ext");

const parse = require("../parse");
const check = require("../check");
const generate = require("../generate");

const Error = require("../error");
const BuildError = require("./error");

function readMuModule(file, context) {
  const { srcDir, modules } = context;
  const srcFile = joinPath(srcDir, file);
  return readFile(srcFile, "utf8").then(src => {
    const defaultImports = [
      {
        type: "import",
        alias: "core",
        module: "core",
        globals: ["join", "isJoin", "bind"],
        location: {}
      }
    ];
    const ast = parse(src);
    ast.imports = defaultImports.concat(ast.imports);
    const module = {
      type: "mu",
      file: file,
      name: ast.name,
      ast: ast
    };
    modules.push(module);
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
  const { ext } = parsePath(file);
  switch(ext) {
    case ".mu": return readMuModule(file, context);
    case ".js": return readJSModule(file, context);
    default: return readUnknownModule(file, context);
  }
}

function checkMuModule(module, { modules }) {
  const { name, ast, file } = module;

  if (ast.type !== "module") {
    throw new BuildError(`Not a module`, { file: file });
  }
  try {
    check(ast);
  }
  catch(e) {
    e.location.file = file;
    throw e;
  }

  const duplicate = modules
    .filter(_module => _module !== module && _module.name === name)[0];
  if (duplicate) {
    throw new BuildError(`Module ${name} is already defined in ${duplicate.file}`, { file: file });
  }

  let imports = {};
  for(let { module, location } of ast.imports) {
    if (imports[module]) {
      location.file = file;
      throw new BuildError(`Duplicate import: ${module}`, location);
    }
    else if (module === name) {
      location.file = file;
      throw new BuildError(`Module ${name} imports itself`, location);
    }
    else {
      imports[module] = true;
    }
  }
  return module;
}

function checkJSModule(module, context) {
  return module;
}

function checkUnknownModule(module, context) {
  return module;
}

function checkModule(module, context) {
  switch(module.type) {
    case "mu": return checkMuModule(module, context);
    case "js": return checkJSModule(module, context);
    default: return checkUnknownModule(module, context);
  }
}

function resolveImportPath({ file }, { file: importFile }) {
  const { dir } = parsePath(file);
  const { dir: importDir, base: importBase } = parsePath(importFile);
  return replaceExt(joinPath(relativePath(dir, importDir), importBase), ".js");
}

function buildMuModule(module, { distDir, modules }) {
  const { name, file, ast } = module;
  const distFile = replaceExt(joinPath(distDir, file), ".js");
  return ensureFile(distFile)
    .then(() => {
      for(let _import of ast.imports) {
        const importedModule = modules
          .filter(({ name }) => _import.module === name)[0];
        if (importedModule) {
          _import.module = resolveImportPath(module, importedModule);
        }
      }
      return generate(ast);
    })
    .then(js => writeFile(distFile, js));
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
  switch(module.type) {
    case "mu": return buildMuModule(module, context);
    case "js": return buildJSModule(module, context);
    default: return buildUnknownModule(module, context);
  }
}

function build(srcDir, distDir) {
  const context = {
    srcDir: srcDir,
    distDir: distDir,
    modules: []
  };
  return walk(srcDir)
    .then(files => files.map(({ root, name }) => relativePath(srcDir, `${root}/${name}`)))
    .then(files => mapPromise(files, file => readModule(file, context)))
    .then(modules => mapPromise(modules, module => checkModule(module, context)))
    .then(modules => mapPromise(modules, module => buildModule(module, context)));
}

module.exports = build;
