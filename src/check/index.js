const CheckError = require("./error");

const defaultOptions = require("../defaultOptions");

class Context {
  constructor(parent) {
    this.parent = parent;
    this.defined = [];
  }

  define(name, location) {
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

function checkLambda({ args, body, location }, context) {
  checkFunctionBody({
    type: "funcion",
    variants: [{ args, body, location }],
    location: location
  }, context);
}

function checkGetter({ keys }, context) {
  for(let key of keys) {
    check(key, context);
  }
}

function checkSetter({ keys }, context) {
  for(let key of keys) {
    check(key, context);
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
    context.define(name, location);
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
    const { type, name, location } = definition;
    if(type === "function" && name) {
      context.define(name, location);
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

function checkGet({ collection, keys }, context) {
  check(collection, context);
  for(let key of keys) {
    check(key, context);
  }
}

function checkDecomp(ast, context) {
  if (ast.type === "name") {
    context.define(ast.name, ast.location);
  }
  else if (ast.type === "demap") {
    for(let { key, name } of ast.items) {
      check(key, context);
      checkDecomp(name, context);
    }
  }
}

function checkImport({ name }, context) {
  checkDecomp(name, context);
}

function checkModuleImports({ name, imports }, context) {
  let imported = {};
  for(let _import of imports) {
    const { module, location } = _import;
    if (module === name) {
      throw new CheckError(`Module ${name} imports itself`, location);
    }
    if (imported[module]) {
      throw new CheckError(`Duplicate import: ${module}`, location);
    }
    check(_import, context);
    imported[module] = true;
  }
}

function checkModuleDefinitions({ definitions }, context) {
  checkDefinitions(definitions, context);
}

function checkExport({ value }, context) {
  check(value, context);
}

function checkModuleExport({ export: _export }, context) {
  if (_export) {
    checkExport(_export, context);
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
    case "lambda": return checkLambda(ast, context);
    case "getter": return checkGetter(ast, context);
    case "setter": return checkSetter(ast, context);
    case "constant": return checkConstant(ast, context);
    case "function": return checkFunction(ast, context);
    case "monad": return checkMonad(ast, context);
    case "case": return checkCase(ast, context);
    case "scope": return checkScope(ast, context);
    case "call": return checkCall(ast, context);
    case "get": return checkGet(ast, context);
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
