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

  get(name, location) {
    if (this.defined.indexOf(name) >= 0) {}
    else if (this.parent) {
      return this.parent.get(name, location);
    }
    else {
      throw new CheckError(`Identifier not defined: ${name}`, location);
    }
  }

  child() {
    return new Scope(this);
  }
}

function checkIdentifier({ name, location }, scope) {
  scope.get(name, location);
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
    else if (type === "constant") {
      check(definition, scope);
    }
    else {
      throw new CheckError(`Internal error: unknown AST type ${type}.`, location);
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

function checkImport({ alias, names, location }, scope) {
  if (alias) {
    scope.define(alias, location);
  }
  for(let name of names) {
    scope.define(name, location);
  }
}

function checkModuleImports({ name, imports }, scope) {
  let imported = {};
  for(let _import of imports) {
    const { module, location } = _import;
    if (module === name) {
      throw new CheckError(`Module ${name} imports itself`, location);
    }
    if (imported[module]) {
      throw new CheckError(`Duplicate import: ${module}`, location);
    }
    check(_import, scope);
    imported[module] = true;
  }
}

function checkModuleDefinitions({ definitions }, scope) {
  checkDefinitions(definitions, scope);
}

function checkModuleExport({ export: _export }, scope) {
  if (_export) {
    const { name, names, location } = _export;
    if (name) {
      scope.get(name, location);
    }
    else if (names) {
      for(let name of names) {
        scope.get(name, location);
      }
    }
  }
}

function checkModule(ast, scope) {
  scope = new Scope();
  const { definitions } = ast;
  checkModuleImports(ast, scope);
  checkModuleDefinitions(ast, scope);
  checkModuleExport(ast, scope);
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
    case "import": return checkImport(ast, scope);
    case "export": return checkExport(ast, scope);
    case "module": return checkModule(ast, scope);
    default: throw new CheckError(`Internal error: unknown AST type ${ast.type}.`, ast.location);
  }
}

module.exports = check;
