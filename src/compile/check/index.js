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

function throwUnknownAST(type, location) {
  throw new CompilationError(`[Internal] Unknown AST ${type}`, location);
}

function throwCantApply(callee, args, location) {
  throw new CompilationError(`Can not apply ${callee} to (${args.join(", ")})`, location);
}

function throwCantNarrow(to, from, location) {
  throw new CompilationError(`Can not narrow ${from} to ${to}`, location);
}

function throwNotDefined(name, location) {
  throw new CompilationError(`Not defined: ${name}`, location);
}

function throwCantRedefine(name, location) {
  throw new CompilationError(`Can not redefine: ${name}`, location);
}

function throwCantCast(to, from, location) {
  throw new CompilationError(`Can not cast ${from} to ${to}`, location);
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

function typeOfFunction({ args, resTypeExpression }) {
  const argTypes = args
    .map((arg) => (arg.typeExpression && evalType(arg.typeExpression)) || typeAny);
  const resType = (resTypeExpression && evalType(resTypeExpression)) || typeAny;
  return typeFunction(argTypes, resType);
}

function evalType(ast) {
  // check(ast, new GlobalContext());
  // check it's a type
  return eval(generate(ast));
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

function checkCall(ast, context) {
  const callee = check(ast.callee, context);
  const args = ast.args.map((arg) => check(arg, context));
  const calleeType = callee.meta.type;
  const argTypes = args.map((arg) => arg.meta.type);
  const type = applyType(calleeType, argTypes, context);
  if (!type) {
    throwCantApply(calleeType, argTypes, ast.location);
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
      //const patternType = evalType(pattern, context.global());
      const type = narrowType(patternType, nameType);
      if (!type) {
        throwCantNarrow(nameType, patternType, pattern.location);
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
  const type = typeOfFunction(ast);
  context = context.spawn();
  ast.args.forEach((arg, i) => {
    context.define(arg, { type: type.args[i], constant: true });
  });
  const body = check(ast.body, context);
  if (!castType(type.res, body.meta.type)) {
    throwCantCast(type.res, body.meta.type, body.location);
  }
  return {
    ...ast,
    body,
    meta: { type }
  };
}

function checkScope(ast, context) {
  context = context.spawn();
  const definitions = ast.definitions.map((definition) => checkDefinition(definition, context));
  const body = check(ast.body, context);
  const type = body.meta.type;
  return {
    ...ast,
    definitions,
    meta: { type }
  };
}

function checkConstantDefinition(ast, context) {
  const value = check(ast.value, context);
  const declaredType = ast.typeExpression && evalType(ast.typeExpression);
  if (declaredType && !castType(declaredType, value.meta.type)) {
    throwCantCast(declaredType, value.meta.type, value.location);
  }
  const type = declaredType || value.meta.type;
  context.define(ast.name, { type });
  return {
    ...ast,
    value,
    meta: { type }
  };
}

function checkFunctionDefinition(ast, context) {
  const type = typeOfFunction(ast);
  context.define(ast.name, { type });
  return checkFunction(ast, context);
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
    case "match": return checkMatch(ast, context);
    case "scope": return checkScope(ast, context);
    case "definition": return checkDefinition(ast, context);
    default: throwUnknownAST(ast.type, ast.location);
  }
}

module.exports = {
  check: (ast) => check(ast, new GlobalContext())
};
