const Error = require("./error");

class CheckError {
  constructor(message, location) {
    this.message = message;
    this.location = location || {
      start: {},
      end: {}
    };
  }
}

class Scope {
  constructor(parent) {
    this.parent = parent;
    this.defined = [];
  }

  define(name, location) {
    if (this.defined.indexOf(name) >= 0) {
      throw new GenerationError(`Duplicate: ${name}`, location);
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

function checkIdentifier({ name }, scope) {
  if (!scope.isDefined(name)) {
    throw new CheckError(`Identifier not defined: ${name}`, ast.location);
  }
}

function checkMap(ast, scope) {
  // TODO
}

function checkVector({ items }, scope) {
  for(let item of items) {
    check(item, scope);
  }
}

function checkLambda({ args, location }, scope) {
  scope = scope.child();
  for(let arg of args) {
    scope.define(arg, location);
  }
  check(body, scope);
}

function checkJoin({ left, via, right, location }, scope) {
  // TODO
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

const defaultImports = [
  {
    type: "import",
    alias: "core",
    module: "muscript-core",
    globals: ["join"]
  }
];

function checkImport({ alias, globals, location }, scope) {
  scope.define(alias, location);
  for(let name of globals) {
    scope.define(name, location);
  }
}

function checkModule({ imports, definitions }, scope) {
  scope = new Scope();
  imports = defaultImports.concat(imports);
  for(let _import of imports) {
    checkImport(_import, scope);
  }
  for(let { name, location } of definitions) {
    scope.define(name, location);
  }
}

function check(ast, scope) {
  if(!scope) {
    scope = new Scope();
  }
  switch (ast.type) {
    case "identifier": return checkIdentifier(ast, scope);
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
