const CheckError = require("./error");

/*class GlobalContext {
  define({ name }, meta) {
    global.monada$env[name] = meta;
  }

  getDefined({ name, location }) {
    throw new CheckError(`Not defined: ${name}`, location);
  }

  spawn() {
    return new LocalContext(this);
  }
}

class LocalContext {
  constructor(parent) {
    this.parent = parent;
    this.defined = {};
  }

  define({ name, location }, meta) {
    if (this.defined[name]) {
      throw new CheckError(`Already defined: ${name}`, location);
    }
    else {
      this.defined[name] = meta;
    }
  }

  getDefined({ name, location }) {
    return this.defined[name] || this.parent.getDefined({ name, location });
  }

  spawn() {
    return new LocalContext(this);
  }
}*/

class Context {
  constructor(definitions, parent) {
    // TODO: optimize -- there might be thousands of definitions in global context
    this.definitions = { ...definitions };
    this.parent = parent;
  }

  define({ name, location }, meta) {
    if (this.definitions[name]) {
      throw new CheckError(`Already defined: ${name}`, location);
    }
    else {
      this.definitions[name] = meta;
    }
  }

  getDefined({ name, location }) {
    const meta = this.definitions[name];
    if (meta) {
      return meta;
    }
    else if (this.parent) {
      return this.parent.getDefined({ name, location });
    }
    else {
      throw new CheckError(`Not defined: ${name}`, location);
    }
  }

  spawn() {
    return new Context({}, this);
  }
}

function checkUndefined(ast, context) {
  return {
    ...ast,
    $type: global.tUndefined
  };
}

function checkNull(ast, context) {
  return {
    ...ast,
    $type: global.tNull
  };
}

function checkFalse(ast, context) {
  return {
    ...ast,
    $type: global.tFalse
  };
}

function checkTrue(ast, context) {
  return {
    ...ast,
    $type: global.tTrue
  };
}

function checkNumber(ast, context) {
  return {
    ...ast,
    $type: global.tPrimitive("number", parseFloat(ast.value))
  };
}

function checkString(ast, context) {
  return {
    ...ast,
    $type: global.tPrimitive("string", ast.value)
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
    $type: context.getDefined(ast).type
  };
}

function checkFunction(ast, context) {
  /*context = context.spawn();
  for(let arg of ast.args) {
    context.define(arg);
  }
  const body = check(ast.body, context);*/
  return ast;
}

function checkCall(ast, context) {
  const callee = check(ast.callee, context);
  const calleeType = callee.$type;
  const args = ast.args.map((arg) => check(arg, context));
  const argTypes = args.map((arg) => arg.$type);
  const { type, fn } = calleeType.example();
  let resType;
  if (type !== "function" ||
      !(resType = fn(...argTypes))) {
    const calleeTypeDescription = calleeType.toString();
    const argTypesDescription = argTypes.map((type) => type.toString()).join(", ");
    throw new CheckError(`Can't apply ${calleeTypeDescription} to (${argTypesDescription})`, ast.location);
  }
  return {
    ...ast,
    callee,
    args,
    $type: resType
  };
}

function checkCase(ast, context) {
  return ast;
}

function checkScope(ast, context) {
  context = context.spawn();
  const definitions = ast.definitions.map((definition) => check(definition, context));
  const body = check(ast.body, context);
  return {
    ...ast,
    definitions,
    body,
    $type: body.$type
  };
}

function checkDefinition(ast, context) {
  context.define(ast.name);
  const value = check(ast.value, context);
  /*const meta = {
    type: "map",
    items: [
      {
        key: {
          type: "string",
          value: "type"
        },
        value:
      }
    ]
  };*/
  return {
    ...ast,
    value,
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
  return check(ast, new Context(global.monada$meta));
};
