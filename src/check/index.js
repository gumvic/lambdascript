const CheckError = require("./error");

class Scope {
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

  isDefined(name) {
    return (
      this.defined.indexOf(name) >= 0 ||
      (this.parent && this.parent.isDefined(name))
    );
  }

  child() {
    return new Scope(this);
  }
}

function checkIdentifier({ name, location }, scope) {
  if (!scope.isDefined(name)) {
    throw new CheckError(`Identifier not defined: ${name}`, location);
  }
}

function checkOperator(ast, scope) {

}

function checkMap(ast, scope) {
  for(let { key, value } of items) {
    check(key, scope);
    check(value, scope);
  }
}

function checkVector({ items }, scope) {
  for(let item of items) {
    check(item, scope);
  }
}

function checkConstant({ name, value, location }, scope) {
  check(value, scope);
  scope.define(name, location);
}

function checkFunctionBody({ args, body, location }, scope) {
  scope = scope.child();
  for(let arg of args) {
    scope.define(arg, location);
  }
  check(body, scope);
}

function checkFunction(definition, scope) {
  const { name } = definition;
  if (name) {
    scope.define(name, location);
  }
  checkFunctionBody(definition, scope);
}

function checkJoin(join, scope) {
  function f({ left, via, right, location }, scope) {
    check(left, scope);
    scope = scope.child();
    scope.define(via, location);
    check(right, scope);
  }
  f(join, scope);
}

function checkDefinitions(definitions, scope) {
  for(let definition of definitions) {
    const { type, name, location } = definition;
    if(type === "function" && name) {
      scope.define(name, location);
    }
    else {
      check(definition, scope);
    }
  }
  for(let definition of definitions) {
    const { type } = definition;
    if(type === "function") {
      checkFunctionBody(definition, scope);
    }
  }
}

function checkCase({ branches, otherwise }, scope) {
  for(let { condition, value } of branches) {
    check(condition, scope);
    check(value, scope);
  }
  check(otherwise, scope);
}

function checkLet({ definitions, body }, scope) {
  scope = scope.child();
  checkDefinitions(definitions, scope);
  check(body, scope);
}

function checkCall({ fun, args }, scope) {
  check(fun, scope);
  for(let arg of args) {
    check(arg, scope);
  }
}

function checkAccess({ object }, scope) {
  check(object, scope);
}

function checkImport({ alias, globals, location }, scope) {
  if (alias) {
    scope.define(alias, location);
  }
  for(let name of globals) {
    scope.define(name, location);
  }
}

function checkModule(module, scope) {
  scope = new Scope();
  const imports = module.imports;
  for(let _import of imports) {
    checkImport(_import, scope);
  }
  checkDefinitions(module.definitions, scope);
  if (module.export) {
    check(module.export, scope);
  }
}

function check(ast, scope) {
  if(!scope) {
    scope = new Scope();
  }
  switch (ast.type) {
    case "undefined":
    case "null":
    case "false":
    case "true":
    case "number":
    case "string": return;
    case "identifier": return checkIdentifier(ast, scope);
    case "operator": return checkOperator(ast, scope);
    case "map":  return checkMap(ast, scope);
    case "vector": return checkVector(ast, scope);
    case "constant": return checkConstant(ast, scope);
    case "function": return checkFunction(ast, scope);
    case "join": return checkJoin(ast, scope);
    case "case": return checkCase(ast, scope);
    case "let": return checkLet(ast, scope);
    case "call": return checkCall(ast, scope);
    case "access": return checkAccess(ast, scope);
    case "module": return checkModule(ast, scope);
    default: throw new CheckError(`Internal compiler error: unknown AST type ${ast.type}.`, ast.location);
  }
}

module.exports = check;
