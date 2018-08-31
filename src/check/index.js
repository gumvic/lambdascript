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

function checkFunction(ast, context) {
  return {
    ...ast,
    $type: {
      type: "function",
      fn(...args) {
        if (args.length !== ast.args.length) {
          return false;
        }
        else {
          const _context = context.spawn();
          for(let i = 0; i < args.length; i++) {
            const arg = ast.args[i];
            const argType = args[i];
            _context.define(arg, {
              type: argType
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
      readable: `fn(${ast.args.map(({ name }) => name).join(", ")}) -> ?`
    }
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
  const definitions = ast.definitions.map((definition) => check(definition, context));
  const body = check(ast.body, context);
  return {
    ...ast,
    definitions,
    $type: body.$type
  };
}

function checkDefinition(ast, context) {
  const value = check(ast.value, context);
  const meta = {
    type: value.$type
  }
  context.define(ast.name, meta);
  return {
    ...ast,
    meta
  };
}

function checkProgram(ast, context) {
  context = context.spawn();
  const statements = ast.statements.map((statement) => check(statement, context));
  return {
    ...ast,
    statements
  };
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
    case "program": return checkProgram(ast, context);
    default: throw new TypeError(`Internal error: unknown AST type ${ast.type}.`);
  }
}

module.exports = function(ast) {
  return check(ast, new GlobalContext());
};
