const { get } = require("immutable");
const CheckError = require("./error");

class GlobalContext {
  constructor() {
    this.meta = {};
  }

  define({ name, location }, meta) {
    if (global.getMeta(name) || this.meta[name]) {
      throw new CheckError(`Already defined: ${name}`, location);
    }
    else {
      this.meta[name] = meta;
    }
  }

  getMeta({ name, location }) {
    const meta = global.getMeta(name) || this.meta[name];
    if (!meta) {
      throw new CheckError(`Not defined: ${name}`, location);
    }
    else {
      return meta;
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
    this.meta = {};
  }

  define({ name, location }, meta) {
    if (this.meta[name]) {
      throw new CheckError(`Already defined: ${name}`, location);
    }
    else {
      this.meta[name] = meta;
    }
  }

  getMeta({ name, location }) {
    return this.meta[name] || this.parent.getMeta({ name, location });
  }

  spawn() {
    return new LocalContext(this);
  }

  isGlobal() {
    return false;
  }
}

function isBoolean({ type }) {
  return type === "boolean";
}
function isTrue({ type, value }) {
  return type === "boolean" && value === true;
}
function isFalse({ type, value }) {
  return type === "boolean" && value === false;
}

function checkUndefined(ast, context) {
  return {
    ...ast,
    $type: global.tFromValue(undefined)
  };
}

function checkNull(ast, context) {
  return {
    ...ast,
    $type: global.tFromValue(null)
  };
}

function checkFalse(ast, context) {
  return {
    ...ast,
    $type: global.tFromValue(false)
  };
}

function checkTrue(ast, context) {
  return {
    ...ast,
    $type: global.tFromValue(true)
  };
}

function checkNumber(ast, context) {
  return {
    ...ast,
    $type: global.tFromValue(parseFloat(ast.value))
  };
}

function checkString(ast, context) {
  return {
    ...ast,
    $type: global.tFromValue(ast.value)
  };
}

function checkList(ast, context) {
  return ast;
}

function checkMap(ast, context) {
  return ast;
}

function checkName(ast, context) {
  return {
    ...ast,
    $type: get(context.getMeta(ast), "type")
  };
}

// TODO copy all of the context's contents that is used, including globals
// than use that context as the base for the .spawn in fn()
function lambdaFunctionType(ast, context) {
  return {
    type: "function",
    fn(...args) {
      if (args.length !== ast.args.length) {
        return false;
      }
      else {
        const _context = context.spawn();
        for(let i = 0; i < args.length; i++) {
          _context.define(ast.args[i], {
            type: args[i]
          });
        }
        try {
          return check(ast.body, _context).$type;
        }
        catch(e) {
          if (e instanceof CheckError) {
            return false;
          }
          else {
            throw e;
          }
        }
      }
    },
    castFrom(_) {
      return false;
    },
    castTo(_) {
      return false;
    },
    readable: ast.text
  };
}

function namedFunctionType(ast, context) {
  return {
    type: "function",
    fn(...args) {
      if (args.length !== ast.args.length) {
        throw new CheckError(`Function doesn't support the arity of ${args.length}`, ast.location);
      }
      else {
        const _context = context.spawn();
        for(let i = 0; i < args.length; i++) {
          _context.define(ast.args[i], {
            type: args[i]
          });
        }
        return check(ast.body, _context).$type;
      }
    },
    castFrom(_) {
      return false;
    },
    castTo(_) {
      return false;
    },
    readable: "TODO"
  };
}

function defaultFunctionType(ast, context) {
  const args = ast.args.map((_) => global.tAny);
  const res = global.tAny;
  return global.tFunction(...args.concat(res));
}

function checkFunction(ast, context) {
  return {
    ...ast,
    $type: lambdaFunctionType(ast, context)
  };
}

function checkCall(ast, context) {
  const callee = check(ast.callee, context);
  const calleeType = callee.$type;
  const args = ast.args.map((arg) => check(arg, context));
  const argTypes = args.map((arg) => arg.$type);
  const { type: calleeTypeType, fn: calleeTypeFn } = calleeType;
  let resType;
  if (calleeTypeType != "function" ||
      !(resType = calleeTypeFn(...argTypes))) {
    const readableCalleeType = global.readableType(calleeType);
    const readableArgTypes = argTypes.map(global.readableType);
    throw new CheckError(`Can't apply ${readableCalleeType} to (${readableArgTypes.join(", ")})`, ast.location);
  }
  return {
    ...ast,
    $type: resType
  };
}

function checkCaseBranches({ branches }, context) {
  branches = branches
    .map(({ condition, value }) => ({ condition: check(condition, context), value }))
    .filter(({ condition }) => !isFalse(condition.$type));
  for (let { condition } of branches) {
    if (!isBoolean(condition.$type)) {
      throw new CheckError(`Can't cast ${condition.$type.readable} to boolean`, condition.location);
    }
  }
  return branches;
}

function checkCase(ast, context) {
  const branches = checkCaseBranches(ast, context);
  if (!branches.length) {
    const result = check(ast.otherwise, context);
    return {
      ...ast,
      $type: result.$type
    };
  }
  else if (isTrue(branches[0].condition.$type)) {
    const result = check(branches[0].value, context);
    return {
      ...ast,
      $type: result.$type
    };
  }
  else {
    const results = branches
      .map(({ value }) => check(value, context))
      .concat(check(ast.otherwise, context));
    return {
      ...ast,
      $type: global.tOr(...results.map(({ $type }) => $type))
    };
  }
}

function checkScope(ast, context) {
  context = context.spawn();
  const definitions = ast.definitions.map((definition) => checkDefinition(definition, context));
  const body = check(ast.body, context);
  return {
    ...ast,
    $type: body.$type
  };
}

function checkLocalConstantDefinition(ast, context) {
  const value = check(ast.value, context);
  context.define(ast.name, {
    type: value.$type
  });
  return ast;
}

function checkLocalFunctionDefinition(ast, context) {
  const type = defaultFunctionType(ast, context);
  const _type = namedFunctionType(ast, context);
  if (!global.castType(type, _type)) {
    throw new CheckError(`Can't cast ${_type.readable} to ${type.readable}`, ast.location);
  }
  context.define(ast.name, {
    type
  });
  return ast;
}

function checkLocalDefinition(ast, context) {
  switch(ast.kind) {
    case "constant": return checkLocalConstantDefinition(ast, context);
    case "function": return checkLocalFunctionDefinition(ast, context);
    default: throw new CheckError(`Internal error: unknown AST definition kind ${ast.kind}.`, ast.location);
  }
}

function checkGlobalConstantDefinition(ast, context) {
  const value = check(ast.value, context);
  const type = value.$type;
  const meta = {
    type
  };
  context.define(ast.name, meta);
  return {
    ...ast,
    $meta: meta
  };
}

function checkGlobalFunctionDefinition(ast, context) {
  const type = defaultFunctionType(ast, context);
  const _type = namedFunctionType(ast, context);
  if (!global.castType(type, _type)) {
    throw new CheckError(`Can't cast ${_type.readable} to ${type.readable}`, ast.location);
  }
  const meta = {
    type
  };
  context.define(ast.name, meta);
  return {
    ...ast,
    $meta: meta
  };
}

function checkGlobalDefinition(ast, context) {
  switch(ast.kind) {
    case "constant": return checkGlobalConstantDefinition(ast, context);
    case "function": return checkGlobalFunctionDefinition(ast, context);
    default: throw new CheckError(`Internal error: unknown AST definition kind ${ast.kind}.`, ast.location);
  }
}

function checkDefinition(ast, context) {
  if (context.isGlobal()) {
    return checkGlobalDefinition(ast, context);
  }
  else {
    return checkLocalDefinition(ast, context);
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
    default: throw new TypeError(`Internal error: unknown AST type ${ast.type}.`);
  }
}

module.exports = function(ast) {
  return check(ast, new GlobalContext());
};
