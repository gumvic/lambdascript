const EvalError = require("./error");

class Context {
  constructor(parent) {
    this.parent = parent;
    this.defined = {};
  }

  define(name, value) {
    return this.defined[name] = value;
  }

  getDefinedLocally(name) {
    return this.defined[name];
  }

  getDefined(name) {
    return (
      this.getDefinedLocally(name) ||
      (this.parent && this.parent.getDefined(name)));
  }

  spawn() {
    return new Context(this);
  }
}

// TODO cache eval'd
function getDefined({ name, location }, context) {
  const defined = context.getDefined(name);
  if (!defined) {
    throw new EvalError(`Not defined: ${name}`, location);
  }
  else {
    return eval(defined, context);
  }
}

function define({ name, location }, value, context) {
  const defined = context.getDefinedLocally(name);
  if (defined) {
    throw new EvalError(`Already defined: ${name}`, location);
  }
  else {
    return context.define(name, value);
  }
}

function evalSkip(ast, context) {
  // TODO
}

function evalUndefined(ast, context) {
  return undefined;
}

function evalNull(ast, context) {
  return null;
}

function evalFalse(ast, context) {
  return false;
}

function evalTrue(ast, context) {
  return true;
}

function evalNumber({ value }, context) {
  return parseFloat(value);
}

function evalString({ value }, context) {
  return value;
}

function evalName(ast, context) {
  return getDefined(ast, context);
}

function evalList(ast, context) {
  // TODO
}

function evalMap(ast, context) {
  // TODO
}

function evalFunction(ast, context) {
  // TODO
  return function(...args) {
    // const _context = context.spawn();
  }
}

function evalCall({ callee, args, location }, context) {
  callee = eval(callee, context);
  args = args.map((arg) => eval(arg, context));
  try {
    return callee(...args);
  }
  catch(e) {
    throw new EvalError(e.message, location);
  }
}

function evalCase({ branches, otherwise }, context) {
  // TODO
}

function evalScope(ast, context) {
  context = context.spawn();
  // TODO
}

function evalModule(ast, context) {
  // TODO
}

function eval(ast, context) {
  switch (ast.type) {
    case "skip": return evalSkip(ast, context);
    case "undefined": return evalUndefined(ast, context);
    case "null": return evalNull(ast, context);
    case "false": return evalFalse(ast, context);
    case "true": return evalTrue(ast, context);
    case "number": return evalNumber(ast, context);
    case "string": return evalString(ast, context);
    case "name": return evalName(ast, context);
    case "list": return evalList(ast, context);
    case "map":  return evalMap(ast, context);
    case "function": return evalFunction(ast, context);
    case "call": return evalCall(ast, context);
    case "case": return evalCase(ast, context);
    case "scope": return evalScope(ast, context);
    case "module": return evalModule(ast, context);
    default: throw new TypeError(`Internal error: unknown AST type ${ast.type}.`);
  }
}

module.exports = function(ast, defined) {
  const context = new Context();
  for(let name in defined) {
    define(name, defined[name], context);
  }
  return eval(ast, context);
};
