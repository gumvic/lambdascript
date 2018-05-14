const CheckError = require("./error");

const defaultOptions = require("../defaultOptions");

class Context {
  constructor(parent) {
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

  assertDefined(name, location) {
    if (this.defined.indexOf(name) >= 0) {}
    else if (this.parent) {
      this.parent.assertDefined(name, location);
    }
    else {
      throw new CheckError(`Name not defined: ${name}`, location);
    }
  }

  spawn() {
    return new Context(this);
  }
}

function checkName({ name, location }, context) {
  context.assertDefined(name, location);
}

function checkMap({ items }, context) {
  for(let { key, value } of items) {
    check(key, context);
    check(value, context);
  }
}

function checkList({ items }, context) {
  for(let item of items) {
    check(item, context);
  }
}

function checkConstant({ name, value, location }, context) {
  check(value, context);
  checkDecomp(name, context);
}

function checkFunctionBody({ name, variants }, context) {
  let definedVariants = {};
  for(let variant of variants) {
    const { args, body, location } = variant;
    const arity = args.length;
    if (definedVariants[arity]) {
      throw new CheckError(`Duplicate definition: ${name} ${args.join(" ")}`, location);
    }
    else {
      definedVariants[arity] = variant;
      const _context = context.spawn();
      for(let arg of args) {
        checkDecomp(arg, _context);
      }
      check(body, _context);
    }
  }
}

function checkFunction(definition, context) {
  const { name } = definition;
  if (name) {
    context.define(name);
  }
  checkFunctionBody(definition, context);
}

function checkMonad({ items }, context) {
  function _check(items, context) {
    if (items.length) {
      const { via, value, location } = items[0];
      check(value, context);
      if (via) {
        context = context.spawn();
        checkDecomp(via, context);
      }
      _check(items.slice(1), context);
    }
  }
  _check(items, context);
}

function checkDefinitions(definitions, context) {
  for(let definition of definitions) {
    const { type, name } = definition;
    if(type === "function") {
      context.define(name);
    }
    else if (type === "constant") {
      check(definition, context);
    }
    else {
      throw new CheckError(`Internal error: unknown AST type ${type}.`, location);
    }
  }
  for(let definition of definitions) {
    const { type } = definition;
    if(type === "function") {
      checkFunctionBody(definition, context);
    }
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

function checkCall({ fun, args }, context) {
  check(fun, context);
  for(let arg of args) {
    check(arg, context);
  }
}

function checkInvoke({ object, args }, context) {
  check(object, context);
  for(let arg of args) {
    check(arg, context);
  }
}

function checkDecomp(ast, context) {
  if (ast.type === "name") {
    context.define(ast);
  }
  else if (ast.type === "alias") {
    context.define(ast.name);
    checkDecomp(ast.value, context);
  }
  else if (ast.type === "demap") {
    for(let { key, name } of ast.items) {
      check(key, context);
      checkDecomp(name, context);
    }
  }
}

function checkImport({ module, names, location }, context) {
  context.define(module);
  for(let name of names) {
    context.define(name);
  }
}

function checkModuleImports({ name, imports }, context) {
  let imported = {};
  for(let _import of imports) {
    const { module: { name: importName }, location } = _import;
    if (importName === name) {
      throw new CheckError(`Module ${name} imports itself`, location);
    }
    if (imported[importName]) {
      throw new CheckError(`Duplicate import: ${importName}`, location);
    }
    check(_import, context);
    imported[importName] = true;
  }
}

function checkModuleDefinitions({ definitions }, context) {
  checkDefinitions(definitions, context);
}

function checkModuleExport({ export: { names } }, context) {
  for(let name of names) {
    check(name, context);
  }
}

function checkModule(ast, context) {
  const { definitions } = ast;
  checkModuleImports(ast, context);
  checkModuleDefinitions(ast, context);
  checkModuleExport(ast, context);
}

function initContext({ autoImports }) {
  const context = new Context()
  for (let _import of autoImports) {
    checkImport(_import, context);
  }
  return context;
}

function check(ast, context) {
  switch (ast.type) {
    case "undefined":
    case "null":
    case "false":
    case "true":
    case "number":
    case "string":
    case "key": return;
    case "name": return checkName(ast, context);
    case "map":  return checkMap(ast, context);
    case "list": return checkList(ast, context);
    case "constant": return checkConstant(ast, context);
    case "function": return checkFunction(ast, context);
    case "monad": return checkMonad(ast, context);
    case "case": return checkCase(ast, context);
    case "scope": return checkScope(ast, context);
    case "call": return checkCall(ast, context);
    case "invoke": return checkInvoke(ast, context);
    case "import": return checkImport(ast, context);
    case "export": return checkExport(ast, context);
    case "module": return checkModule(ast, context);
    default: throw new CheckError(`Internal error: unknown AST type ${ast.type}.`, ast.location);
  }
}

module.exports = function(ast, options) {
  options = options || defaultOptions;
  return check(ast, initContext(options));
};
