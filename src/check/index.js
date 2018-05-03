const CheckError = require("./error");

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

  get(name, location) {
    if (this.defined.indexOf(name) >= 0) {}
    else if (this.parent) {
      return this.parent.get(name, location);
    }
    else {
      throw new CheckError(`Name not defined: ${name}`, location);
    }
  }

  spawn() {
    return new Context(this);
  }
}

function checkIdentifier({ name, location }, context) {
  context.get(name, location);
}

function checkOperator(ast, context) {

}

function checkMap(ast, context) {
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
  context.define(name, location);
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
        _context.define(arg, location);
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

function checkJoin(join, context) {
  function f({ left, via, right, location }, context) {
    check(left, context);
    context = context.spawn();
    context.define(via, location);
    check(right, context);
  }
  f(join, context);
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

function checkLet({ definitions, body }, context) {
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

function checkAccess({ object }, context) {
  check(object, context);
}

function checkImport({ alias, names, location }, context) {
  if (alias) {
    context.define(alias, location);
  }
  for(let name of names) {
    context.define(name, location);
  }
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

function checkModuleExport({ export: _export }, context) {
  if (_export) {
    const { name, names, location } = _export;
    if (name) {
      context.get(name, location);
    }
    else if (names) {
      for(let name of names) {
        context.get(name, location);
      }
    }
  }
}

function checkModule(ast, context) {
  context = new Context();
  const { definitions } = ast;
  checkModuleImports(ast, context);
  checkModuleDefinitions(ast, context);
  checkModuleExport(ast, context);
}

function check(ast, context) {
  if(!context) {
    context = new Context();
  }
  switch (ast.type) {
    case "undefined":
    case "null":
    case "false":
    case "true":
    case "number":
    case "string": return;
    case "identifier": return checkIdentifier(ast, context);
    case "operator": return checkOperator(ast, context);
    case "map":  return checkMap(ast, context);
    case "list": return checkList(ast, context);
    case "lambda": return checkLambda(ast, context);
    case "getter": return checkGetter(ast, context);
    case "setter": return checkSetter(ast, context);
    case "constant": return checkConstant(ast, context);
    case "function": return checkFunction(ast, context);
    case "join": return checkJoin(ast, context);
    case "case": return checkCase(ast, context);
    case "let": return checkLet(ast, context);
    case "call": return checkCall(ast, context);
    case "access": return checkAccess(ast, context);
    case "import": return checkImport(ast, context);
    case "export": return checkExport(ast, context);
    case "module": return checkModule(ast, context);
    default: throw new CheckError(`Internal error: unknown AST type ${ast.type}.`, ast.location);
  }
}

module.exports = check;
