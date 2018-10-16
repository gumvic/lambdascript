const { generate } = require("../generate");
const { symbol } = require("../meta");
const Error = require("../error");

function throwUnknownAST(type, location) {
  throw new Error(`[Internal] Unknown AST ${type}`, location);
}

function throwNotDefined(name, location) {
  throw new Error(`Not defined: ${name}`, location);
}

function throwCantRedefine(name, location) {
  throw new Error(`Can not redefine: ${name}`, location);
}

class GlobalContext {
  constructor() {
    this.symbols = {};
  }

  symbol({ name, location }, data) {
    if (data === undefined) {
      return this.symbols[name] || symbol(name) || throwNotDefined(name, location);
    }
    else {
      const oldData = this.symbols[name] || symbol(name) || {};
      if (oldData.constant) {
        throwCantRedefine(name, location);
      }
      else {
        return this.symbols[name] = {
          ...oldData,
          ...data
        };
      }
    }
  }

  spawn() {
    return new LocalContext(this);
  }

  isGlobal() {
    return true;
  }
}

class LocalContext {
  constructor(parent) {
    this.parent = parent;
    this.symbols = {};
  }

  symbol({ name, location }, data) {
    if (data === undefined) {
      return this.symbols[name] || this.parent.symbol({name, location}) || throwNotDefined(name, location);
    }
    else {
      if (this.symbols[name]) {
        throwCantRedefine(name, location);
      }
      else {
        return this.symbols[name] = data;
      }
    }
  }

  spawn() {
    return new LocalContext(this);
  }

  isGlobal() {
    return false;
  }
}

function checkUndefined(ast, context) {
  return ast;
}

function checkNull(ast, context) {
  return ast;
}

function checkFalse(ast, context) {
  return ast;
}

function checkTrue(ast, context) {
  return ast;
}

function checkNumber(ast, context) {
  return ast;
}

function checkString(ast, context) {
  return ast;
}

function checkList(ast, context) {
  return {
    ...ast,
    items: ast.items.map((item) => check(item, context))
  };
}

function checkMap(ast, context) {
  return {
    ...ast,
    items: ast.items.map(({ key, value }) => ({
      key: check(key, context),
      value: check(value, context)
    }))
  };
}

function checkName(ast, context) {
  context.symbol(ast);
  return ast;
}

function checkCall(ast, context) {
  return {
    ...ast,
    callee: check(ast.callee, context),
    args: ast.args.map((arg) => check(arg, context))
  };
}

function checkCase(ast, context) {
  return {
    ...ast,
    branches: ast.branches.map(({ condition, value }) => ({
      condition: check(condition, context),
      value: check(value, context)
    })),
    otherwise: check(ast.otherwise, context)
  };
}

function checkFunction(ast, context) {
  context = context.spawn();
  for(let arg of ast.args) {
    context.symbol(arg, {});
  }
  return {
    ...ast,
    body: check(ast.body, context)
  };
}

// TODO
function checkScope(ast, context) {
  context = context.spawn();
  for(let { name, type } of ast.definitions) {
    if (type === "function") {
      context.symbol(name, {});
    }
  }
  return {
    ...ast,
    definitions: ast.definitions.map((definition) => checkDefinition(definition, context)),
    body: check(ast.body, context)
  };
}

function checkConstantDefinition(ast, context) {
  if (context.isGlobal()) {
    return {
      ...ast,
      value: check(ast.value, context)
    };
  }
  else {
    return {
      ...ast,
      value: check(ast.value, context)
    };
  }
}

function checkFunctionDefinition(ast, context) {
  if (context.isGlobal()) {
    context.symbol(ast.name, {});
    return checkFunction(ast, context);
  }
  else {
    return checkFunction(ast, context);
  }
}

function checkDefinition(ast, context) {
  switch(ast.kind) {
    case "constant": return checkConstantDefinition(ast, context);
    case "function": return checkFunctionDefinition(ast, context);
    default: throwUnknownAST(ast.kind, ast.location);
  }
}

function check(ast, context) {
  switch (ast.type) {
    case "skip": return checkSkip(ast, context);
    case "undefined": return checkUndefined(ast, context);
    case "null": return checkNull(ast, context);
    case "false": return checkFalse(ast, context);
    case "true": return checkTrue(ast, context);
    case "number": return checkNumber(ast, context);
    case "string": return checkString(ast, context);
    case "name": return checkName(ast, context);
    case "list": return checkList(ast, context);
    case "map":  return checkMap(ast, context);
    case "function": return checkFunction(ast, context);
    case "call": return checkCall(ast, context);
    case "case": return checkCase(ast, context);
    case "scope": return checkScope(ast, context);
    case "definition": return checkDefinition(ast, context);
    default: throwUnknownAST(ast.type, ast.location);
  }
}

module.exports = {
  check: (ast) => check(ast, new GlobalContext())
};
