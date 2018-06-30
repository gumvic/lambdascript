const CheckError = require("./error");

const defaultOptions = require("../defaultOptions");

const MAIN = "main";

class Context {
  constructor(options, parent) {
    this.options = options;
    this.parent = parent;
    this.defined = [];
    this.forbidden = this.parent ?
      Object.values(options.essentials) :
      [];
  }

  define({ name, location }) {
    if (this.isDefinedLocally({ name, location }) ||
        this.forbidden.indexOf(name) >= 0) {
      throw new CheckError(`Duplicate definition: ${name}`, location);
    }
    else {
      this.defined.push(name);
    }
  }

  isDefinedLocally({ name }) {
    return this.defined.indexOf(name) >= 0;
  }

  isDefined(ast) {
    if (this.isDefinedLocally(ast)) {
      return true;
    }
    else if (this.parent) {
      return this.parent.isDefined(ast);
    }
    else {
      return false;
    }
  }

  assertDefined({ name, location }) {
    if (!this.isDefined({ name, location })) {
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

function checkListItem(item, context) {
  if (item.type === "spread") {
    check(item.value, context);
  }
  else {
    check(item, context);
  }
}

function checkList({ items, location }, context) {
  context.assertDefined({ name: context.options.essentials.list, location });
  for(let item of items) {
    checkListItem(item, context);
  }
}

function checkMapItem(item, context) {
  if (item.type === "spread") {
    check(item.value, context);
  }
  else {
    check(item.key, context);
    check(item.value, context);
  }
}

function checkMap({ items, location }, context) {
  context.assertDefined({ name: context.options.essentials.map, location });
  for(let item of items) {
    checkMapItem(item, context);
  }
}

function checkLambda({ args, restArgs, body, location }, context) {
  const _context = context.spawn();
  for(let arg of args) {
    checkLValue(arg, _context);
  }
  if (restArgs) {
    context.assertDefined({ name: context.options.essentials.list, location });
    checkLValue(restArgs, context);
  }
  check(body, _context);
}

function checkMonad({ items, location }, context) {
  context.assertDefined({ name: context.options.essentials.monad, location });
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

function checkConstant({ lvalue, value }, context) {
  check(value, context);
  checkLValue(lvalue, context);
}

function checkFunction({ variants }, context) {
  // TODO check arities
  for(let variant of variants) {
    checkLambda(variant, context);
  }
}

function checkRecord({ name, args, location }, context) {
  context.assertDefined({ name: context.options.essentials.record, location });
  const _context = context.spawn();
  for(let arg of args) {
    checkLValue(arg, _context);
  }
}

function checkDefinitions(definitions, context) {
  const constants = definitions
    .filter(({ type }) => type === "constant");
  const functions = definitions
    .filter(({ type }) => type === "function");
  const records = definitions
    .filter(({ type }) => type === "record");
  for(let { name } of records) {
    context.define(name);
    context.define({ name: `is${name.name}` });
  }
  for(let { name } of functions) {
    context.define(name);
  }
  for(let constant of constants) {
    checkConstant(constant, context);
  }
  for(let fun of functions) {
    checkFunction(fun, context);
  }
  for(let record of records) {
    checkRecord(record, context);
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

function checkCallArg(arg, context) {
  if (arg.type === "spread") {
    check(arg.value, context);
  }
  else {
    check(arg, context);
  }
}

function checkCall({ callee, args }, context) {
  check(callee, context);
  for(let arg of args) {
    checkCallArg(arg, context);
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

function checkSkipLValue(_, context) {

}

function checkNameLValue(name, context) {
  context.define(name);
}

function checkAliasLValue({ name, lvalue }, context) {
  context.define(name);
  checkLValue(lvalue, context);
}

function checkListDestructLValue({ items, restItems, location }, context) {
  context.assertDefined({ name: context.options.essentials.get, location });
  context.assertDefined({ name: context.options.essentials.merge, location });
  context.assertDefined({ name: context.options.essentials.remove, location });
  for(let lvalue of items) {
    checkLValue(lvalue, context);
  }
  if (restItems) {
    checkLValue(restItems, context);
  }
}

function checkMapDestructLValue({ items, restItems, location }, context) {
  context.assertDefined({ name: context.options.essentials.get, location });
  context.assertDefined({ name: context.options.essentials.merge, location });
  context.assertDefined({ name: context.options.essentials.remove, location });
  for(let { key, lvalue } of items) {
    check(key, context);
    checkLValue(lvalue, context);
  }
  if (restItems) {
    checkLValue(restItems, context);
  }
}

function checkLValue(lvalue, context) {
  switch(lvalue.type) {
    case "skip": checkSkipLValue(lvalue, context); break;
    case "name": checkNameLValue(lvalue, context); break;
    case "alias": checkAliasLValue(lvalue, context); break;
    case "listDestruct": checkListDestructLValue(lvalue, context); break;
    case "mapDestruct": checkMapDestructLValue(lvalue, context); break;
    default: new CheckError(`Internal error: unknown AST type ${lvalue.type}.`, lvalue.location);
  }
}

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

function checkModuleCoreImport(_, context) {
  const { module, imports } = context.options.core;
  context.define({ name: module });
  for(let _import of imports) {
    context.define({ name: _import });
  }
}

function checkModuleImports(module, context) {
  const { name: { name: moduleName }, imports } = module;
  context.define({ name: moduleName });
  checkModuleCoreImport(module, context);
  for(let _import of imports) {
    checkImport(_import, context);
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
        throw new CheckError(`Already exported: ${name.name}`, name.location);
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
  checkExport(_export, context);
}

function checkApp(ast, context) {
  checkModuleImports(ast, context);
  checkModuleDefinitions(ast, context);
  context.assertDefined({ name: MAIN });
}

function checkLib(ast, context) {
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
    case "literal":
    case "skip":
    case "key":
    case "property":
    case "symbol": return;
    case "name": return checkName(ast, context);
    case "list": return checkList(ast, context);
    case "map":  return checkMap(ast, context);
    case "lambda": return checkLambda(ast, context);
    case "monad": return checkMonad(ast, context);
    case "case": return checkCase(ast, context);
    case "scope": return checkScope(ast, context);
    case "call": return checkCall(ast, context);
    case "access": return checkAccess(ast, context);
    case "invoke": return checkInvoke(ast, context);
    case "module": return checkModule(ast, context);
    default: throw new CheckError(`Internal error: unknown AST type ${ast.type}.`, ast.location);
  }
}

module.exports = function(ast, options) {
  options = options || defaultOptions;
  return check(ast, new Context(options));
};
