const CheckError = require("./error");

const defaultOptions = require("../defaultOptions");

class Context {
  constructor(options, parent) {
    this.options = options;
    this.parent = parent;
    this.defined = [];
  }

  define({ name, location }) {
    if (this.defined.indexOf(name) >= 0) {
      throw new CheckError(`Duplicate definition: ${name}`, location);
    }
    else {
      this.defined.push(name);
    }
  }

  assertDefined({ name, location }) {
    if (this.defined.indexOf(name) >= 0) {}
    else if (this.parent) {
      this.parent.assertDefined({ name, location });
    }
    else {
      throw new CheckError(`Name not defined: ${name}`, location);
    }
  }

  spawn() {
    return new Context(this.options, this);
  }
}

function checkName(ast, context) {
  context.assertDefined(ast);
}

function checkList({ items }, context) {
  // TODO check for ImList
  for(let item of items) {
    check(item, context);
  }
}

function checkMap({ items }, context) {
  // TODO check for ImMap
  for(let { key, value } of items) {
    check(key, context);
    check(value, context);
  }
}

function checkLambda({ args, body }, context) {
  const _context = context.spawn();
  for(let arg of args) {
    checkLValue(arg, _context);
  }
  check(body, _context);
}

function checkFunction({ variants }, context) {
  let definedVariants = {};
  for(let variant of variants) {
    const { args, body, location } = variant;
    const arity = args.length;
    if (definedVariants[arity]) {
      throw new CheckError(`Duplicate definition: (${args.map(({ name }) => name).join(" ")})`, location);
    }
    else {
      definedVariants[arity] = variant;
      checkLambda({ args, body }, context);
    }
  }
}

function checkRecord({ args }, context) {
  // TODO check for Record
  const _context = context.spawn();
  for(let arg of args) {
    checkLValue(arg, _context);
  }
}

function checkMonad({ items }, context) {
  // TODO check for Monad
  function _check(items, context) {
    if (items.length) {
      const { via, value, location } = items[0];
      check(value, context);
      if (via) {
        context = context.spawn();
        checkLValue(via, context);
      }
      _check(items.slice(1), context);
    }
  }
  _check(items, context);
}

function checkDefinitions(definitions, context) {
  const constants = definitions
    .filter(({ type }) => type === "constant");
  const functions = definitions
    .filter(({ type }) => type === "function");
  const records = definitions
    .filter(({ type }) => type === "record");
  for (let { name } of records) {
    context.define(name);
  }
  for (let { name } of functions) {
    context.define(name);
  }
  for(let { lvalue, value } of constants) {
    check(value, context);
    checkLValue(lvalue, context);
  }
  for(let fun of functions) {
    checkFunction(fun, context);
  }
  for(let fun of records) {
    checkRecord(fun, context);
  }
}

function checkCase({ branches, otherwise }, context) {
  for(let { condition, value } of branches) {
    check(condition, context);
    check(value, context);
  }
  check(otherwise, context);
}

function checkScope({ definitions, body }, context) {
  context = context.spawn();
  checkDefinitions(definitions, context);
  check(body, context);
}

function checkCall({ callee, args }, context) {
  check(callee, context);
  for(let arg of args) {
    check(arg, context);
  }
}

function checkAccess({ object }, context) {
  check(object, context);
}

function checkInvoke({ object, args }, context) {
  check(object, context);
  for(let arg of args) {
    check(arg, context);
  }
}

function checkLValue(ast, context) {
  if (ast.type === "name") {
    context.define(ast);
  }
  else if (ast.type === "alias") {
    context.define(ast.name);
    checkLValue(ast.lvalue, context);
  }
  else if (ast.type === "listDestruct") {
    // TODO check for get
    for(let lvalue of ast.items) {
      checkLValue(lvalue, context);
    }
  }
  else if (ast.type === "mapDestruct") {
    // TODO check for get
    for(let { key, lvalue } of ast.items) {
      check(key, context);
      checkLValue(lvalue, context);
    }
  }
  else {
    new CheckError(`Internal error: unknown AST type ${ast.type}.`, ast.location);
  }
}

/*function checkAutoImport({ module, value }, context) {
  context.define({
    type: "name",
    name: module
  });
  if (typeof value === "string") {
    context.define({
      type: "name",
      name: value
    });
  }
  else {
    for(let k in value) {
      context.define({
        type: "name",
        name: value[k]
      });
    }
  }
}*/

function checkImport({ module, value }, context) {
  if (module) {
    context.define(module);
  }
  if (value.type === "symbols") {
    let imported = {};
    for(let { key, name } of value.items) {
      if (imported[key.name]) {
        throw new CheckError(`Already imported: ${key.name}`, key.location);
      }
      context.define(name);
      imported[key.name] = true;
    }
  }
  else if (value.type === "symbol") {
    context.define(value);
  }
  else {
    new CheckError(`Internal error: unknown AST type ${value.type}.`, value.location);
  }
}

function checkAutoImports(context) {
  const { options: { autoImports } } = context;
  for(let _import of autoImports) {
    checkAutoImport(_import, context);
  }
}

function checkModuleImports({ name: { name: moduleName }, imports }, context) {
  let imported = {};
  for(let _import of imports) {
    const { module: importedModule, location } = _import;
    if (importedModule) {
      if (importedModule.name === moduleName) {
        throw new CheckError(`Module ${moduleName} imports itself`, location);
      }
      if (imported[importedModule.name]) {
        throw new CheckError(`Duplicate import: ${importName}`, location);
      }
      imported[importedModule.name] = true;
    }
    check(_import, context);
  }
}

function checkModuleDefinitions({ definitions }, context) {
  checkDefinitions(definitions, context);
}

function checkExport({ value, location }, context) {
  if (value.type === "symbols") {
    let exported = {};
    for(let { key, name } of value.items) {
      context.assertDefined(key);
      if (exported[name.name]) {
        throw new CheckError(`Already exported: ${name.name}`, key.location);
      }
      exported[name.name] = true;
    }
  }
  else if (value.type === "symbol") {
    context.assertDefined(value);
  }
  else {
    new CheckError(`Internal error: unknown AST type ${value.type}.`, value.location);
  }
}

function checkModuleExport({ export: _export }, context) {
  check(_export, context);
}

function checkApp(ast, context) {
  const { options: { main } } = context;
  checkAutoImports(context);
  checkModuleImports(ast, context);
  checkModuleDefinitions(ast, context);
  context.assertDefined({ name: main });
}

function checkLib(ast, context) {
  checkAutoImports(context);
  checkModuleImports(ast, context);
  checkModuleDefinitions(ast, context);
  checkModuleExport(ast, context);
}

function checkModule(ast, context) {
  if (!ast.export) {
    return checkApp(ast, context);
  }
  else {
    return checkLib(ast, context);
  }
}

function check(ast, context) {
  switch (ast.type) {
    case "nil":
    case "number":
    case "string":
    case "key": return;
    case "name": return checkName(ast, context);
    case "map":  return checkMap(ast, context);
    case "list": return checkList(ast, context);
    case "lambda": return checkLambda(ast, context);
    case "monad": return checkMonad(ast, context);
    case "case": return checkCase(ast, context);
    case "scope": return checkScope(ast, context);
    case "call": return checkCall(ast, context);
    case "access": return checkAccess(ast, context);
    case "invoke": return checkInvoke(ast, context);
    case "import": return checkImport(ast, context);
    case "export": return checkExport(ast, context);
    case "module": return checkModule(ast, context);
    default: throw new CheckError(`Internal error: unknown AST type ${ast.type}.`, ast.location);
  }
}

module.exports = function(ast, options) {
  options = options || defaultOptions;
  return check(ast, new Context(options));
};
