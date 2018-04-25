const CheckError = require("./error");

class Scope {
  constructor(parent) {
    this.parent = parent;
    this.defined = [];
  }

  define(name, location) {
    if (this.defined.indexOf(name) >= 0) {
      throw new CheckError(`Duplicate: ${name}`, location);
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

function checkLambda({ args, body, location }, scope) {
  scope = scope.child();
  for(let arg of args) {
    scope.define(arg, location);
  }
  check(body, scope);
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

function checkCase({ branches, otherwise }, scope) {
  for(let { condition, value } of branches) {
    check(condition, scope);
    check(value, scope);
  }
  check(otherwise, scope);
}

function checkLet({ definitions, body }, scope) {
  scope = scope.child();
  for(let { name, location } of definitions) {
    scope.define(name, location);
  }
  for(let { value, location } of definitions) {
    check(value, scope);
  }
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
  scope.define(alias, location);
  for(let name of globals) {
    scope.define(name, location);
  }
}

// TODO throw on duplicate imports
function checkModule(module, scope) {
  scope = new Scope();
  const imports = module.imports;
  for(let _import of imports) {
    checkImport(_import, scope);
  }
  for(let { name, location } of module.definitions) {
    scope.define(name, location);
  }
  for(let { value, location } of module.definitions) {
    check(value, scope);
  }
  check(module.export, scope);
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
    case "lambda": return checkLambda(ast, scope);
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
