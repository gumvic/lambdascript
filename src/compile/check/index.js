const { generate } = require("../generate");
const {
  castType,
  typeNone,
  typeUndefined,
  typeNull,
  typeBoolean,
  typeNumber,
  typeString,
  typeFunction,
  typeOr
} = require("../../type");
const { getDefined } = require("../../meta");
const CompilationError = require("../error");

function throwNotDefined(name, location) {
  throw new CompilationError(`Not defined: ${name}`, location);
}

function throwCantRedefine(name, location) {
  throw new CompilationError(`Can not redefine: ${name}`, location);
}

function throwCantCast(to, from, location) {
  throw new CompilationError(`Can not cast ${from} to ${to}`, location);
}

class GlobalContext {
  constructor() {
    this.defined = {};
  }

  define({ name, location }, data) {
    const oldData = this.defined[name] || getDefined(name) || {};
    if (oldData.constant) {
      throwCantRedefine(name, location);
    }
    else if (oldData.type && !castType(oldData.type, data.type)) {
      throwCantCast(oldData.type, data.type, location);
    }
    else {
      return this.defined[name] = data;
    }
  }

  getDefined({ name, location }) {
    const data = this.defined[name] || getDefined(name);
    if (!data) {
      throwNotDefined(name, location);
    }
    else {
      return data;
    }
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

  define({ name, location }, data) {
    const oldData = this.defined[name] || {};
    if (oldData.constant) {
      throwCantRedefine(name, location);
    }
    else if (oldData.type && !castType(oldData.type, data.type)) {
      throwCantCast(oldData.type, data.type, location);
    }
    else {
      return this.defined[name] = data;
    }
  }

  getDefined({ name, location }) {
    return this.defined[name] || this.parent.getDefined({ name, location });
  }

  spawn() {
    return new LocalContext(this);
  }
}

function checkUndefined(ast, context) {
  return {
    ...ast,
    meta: {
      type: typeUndefined
    }
  };
}

function checkNull(ast, context) {
  return {
    ...ast,
    meta: {
      type: typeNull
    }
  };
}

function checkFalse(ast, context) {
  return {
    ...ast,
    meta: {
      type: typeBoolean(false)
    }
  };
}

function checkTrue(ast, context) {
  return {
    ...ast,
    meta: {
      type: typeBoolean(true)
    }
  };
}

function checkNumber(ast, context) {
  return {
    ...ast,
    meta: {
      type: typeNumber(parseFloat(ast.value))
    }
  };
}

function checkString(ast, context) {
  return {
    ...ast,
    meta: {
      type: typeString(ast.value)
    }
  };
}

function checkList(ast, context) {
  // TODO
  return ast;
}

function checkMap(ast, context) {
  // TODO
  return ast;
}

function checkName(ast, context) {
  return {
    ...ast,
    meta: {
      type: context.getDefined(ast).type
    }
  };
}

function applyType(callee, args, context) {
  switch(callee.type) {
    case "or":
      let types = [];
      for (let _callee of callee.types) {
        const res = applyType(_callee, args, context);
        if (!res) {
          return undefined;
        }
        else {
          types.push(res);
        }
      }
      return typeOr(types);
    case "and":
      for (let _callee of callee.types) {
        const res = applyType(_callee, args, context);
        if (res) {
          return res;
        }
      }
      return undefined;
    case "function":
      return callee.fn(...args);
    default:
      return undefined;
  }
}

function checkCall(ast, context) {
  const callee = check(ast.callee, context);
  const args = ast.args.map((arg) => check(arg, context));
  const calleeType = callee.meta.type;
  const argTypes = args.map((arg) => arg.meta.type);
  const type = applyType(calleeType, argTypes, context);
  if (!type) {
    throw new CompilationError(`Can not apply ${calleeType} to (${argTypes.join(", ")})`, ast.location);
  }
  else {
    return {
      ...ast,
      callee,
      args,
      meta: {
        type
      }
    };
  }
}

function checkCase(ast, context) {
  const branches = ast.branches.map(({ condition, value }) => ({
    condition: check(condition, context),
    value: check(value, context)
  }));
  const otherwise = check(ast.otherwise, context);
  const branchTypes = branches.map((branch) => branch.value.meta.type);
  const otherwiseType = otherwise.meta.type;
  const type = typeOr([...branchTypes, otherwiseType]);
  return {
    ...ast,
    branches,
    otherwise,
    meta: { type }
  };
}

function narrowType(to, from) {
  switch(from.type) {
    case "or":
      const types = from.types
        .map((from) => narrowType(to, from))
        .filter((type) => !!type);
      return types.length && typeOr([types]);
    case "and":
      const types = from.types
        .map((from) => narrowType(to, from))
        .filter((type) => !!type);
      return types.length && typeAnd([types]);
    default:
      return (
        (castType(to, from) && from) ||
        (castType(from, to) && to));
  }
}

function checkMatch(ast, context) {
  const names = ast.names;
  const nameTypes = ast.names.map((name) => {
    const type = context.getDefined(name).type;
  });
  const branches = ast.branches.map(({ patterns, value }) => {
    // TODO check patterns in global context
    const _context = context.spawn();
    for(let i = 0; i < names.length; i++) {
      const name = names[i];
      const pattern = patterns[i];
      const nameType = nameTypes[i];
      // TODO
      //const patternType = eval(pattern, context.global());
      const type = narrowType(patternType, nameType);
      if (!type) {
        throw new CompilationError(`Can not narrow ${nameType} to ${patternType}`, pattern.location);
      }
      else {
        _context.define(name, { type });
      }
    }
    value = check(value, _context);
    return {
      patterns,
      value
    };
  });
  const otherwise = check(ast.otherwise, context);
  const branchTypes = branches.map((branch) => branch.value.meta.type);
  const otherwiseType = otherwise.meta.type;
  const type = typeOr([...branchTypes, otherwiseType]);
  return {
    ...ast,
    branches,
    otherwise,
    meta: { type }
  };
}

function checkFunction(ast, context) {

}

function checkScope(ast, context) {
  context = context.spawn();
  for(let definition of ast.definitions) {
    checkDefinition(definition, context);
  }
  const body = check(ast.body, context);
  const type = body.meta.type;
  return {
    ...ast,
    meta: { type }
  };
}

function checkDefinition(ast, context) {
  const value = check(ast.value, context);
  const type = value.meta.type;
  context.define(ast.name, { type });
  return {
    ...ast,
    value,
    meta: { type }
  };
}

// TODO refactor
/*function _checkFunctionDefinition(declaredType, definition, context) {
  const { type, types, args: declaredArgs, res: declaredRes } = declaredType;
  const { args, body, location } = definition;
  switch(type) {
    case "or":
      let errors = [];
      for (let _type of types) {
        try {
          _checkFunctionDefinition(_type, definition, context);
          return;
        }
        catch(e) {
          if (e instanceof CompilationError) {
            errors.push(e);
          }
          else {
            throw e;
          }
        }
      }
      throw errors[0];
    case "and":
      for (let _type of types) {
        _checkFunctionDefinition(_type, definition, context);
      }
      return;
    case "function":
      if (declaredArgs.length !== args.length) {
        throw new CompilationError(`Declared arity ${declaredArgs.length} does not match defined arity ${args.length}`, location);
      }
      else {
        const _context = context.spawn();
        for(let i = 0; i < args.length; i++) {
          _context.define(args[i], { type: declaredArgs[i] });
        }
        const res = check(body, _context).meta.type;
        if (!castType(declaredRes, res)) {
          throwCantCast(declaredRes, res, body.location);
        }
      }
      return;
    default:
      throw new CompilationError(`Declared type is not a function: ${declaredType}`, location);
  }
}*/

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
    case "match": return checkMatch(ast, context);
    case "scope": return checkScope(ast, context);
    case "definition": return checkDefinition(ast, context);
    default: throw new TypeError(`Internal error: unknown AST type ${ast.type}.`);
  }
}

module.exports = {
  check: (ast) => check(ast, new GlobalContext())
};
