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
    this.definedName = null;
    this.definedData = null;
    this.dependencies = [];
  }

  isGlobal() {
    return true;
  }

  define({ name, location }, data) {
    const oldData = this.definedName === name ? this.definedData : getDefined(name);
    if (oldData && oldData.constant) {
      throwCantRedefine(name, location);
    }
    else {
      this.definedName = name;
      this.definedData = data;
      if (oldData && !castType(oldData.type, data.type)) {
        for(let dependantName of oldData.dependants) {
          const dependant = this.getDefined({ name: dependantName, location});
          const context = new GlobalContext();
          context.definedName = this.definedName;
          context.definedData = this.definedData;
          check(dependant.ast, context);
        }
      }
      return this.definedData;
    }
  }

  getDefined({ name, location }) {
    if (this.definedName === name) {
      return this.definedData;
    }
    else {
      const data = getDefined(name);
      if (data) {
        if (this.dependencies.indexOf(name) < 0) {
          this.dependencies.push(name);
        }
        return data;
      }
      else {
        throwNotDefined(name, location);
      }
    }
  }

  getDependencies() {
    return this.dependencies;
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

  isGlobal() {
    return false;
  }

  define({ name, location }, data) {
    const oldData = this.defined[name] || {};
    if (oldData && oldData.constant) {
      throwCantRedefine(name, location);
    }
    else if (oldData && !castType(oldData.type, data.type)) {
      throwCantCast(oldData.type, data.type, location);
    }
    else {
      return this.defined[name] = { ...oldData, ...data };
    }
  }

  getDefined({ name, location }) {
    return this.defined[name] || this.parent.getDefined({ name, location });
  }

  getDependencies() {
    return [];
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

// TODO copy all of the context's contents, then spawn off of that
function checkFunction(ast, context) {
  const args = ast.args.map((_) => typeNone);
  const res = typeNone;
  function fn(...args) {
    try {
      const _context = context.spawn();
      for(let i = 0; i < args.length; i++) {
        _context.define(ast.args[i], { type: args[i] });
      }
      return check(ast.body, _context).meta.type;
    }
    catch(e) {
      if (e instanceof CompilationError) {
        return undefined;
      }
      else {
        throw e;
      }
    }
  }
  const readable = ast.text;
  const type =  typeFunction(args, res, fn, readable);
  return {
    ...ast,
    meta: { type }
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
        _context.define(name, { type, constant: true });
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

function checkDeclarationDefinition(ast, context) {
  // TODO check typeAST in global context
  // typeAST = check(ast.typeAST)
  // include into ...ast
  const type = eval(generate(ast.typeAST));
  context.define(ast.name, { type });
  return {
    ...ast,
    meta: { type }
  };
}

function checkConstantDefinition(ast, context) {
  const value = check(ast.value, context);
  const type = value.meta.type;
  context.define(ast.name, { type, constant: !context.isGlobal() });
  const dependencies = context.getDependencies();
  return {
    ...ast,
    value,
    meta: { type, dependencies }
  };
}

// TODO refactor
function _checkFunctionDefinition(declaredType, definition, context) {
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
}

function checkFunctionDefinition(ast, context) {
  const type = context.getDefined(ast.name).type;
  _checkFunctionDefinition(type, ast, context);
  context.define(ast.name, { type, constant: !context.isGlobal() });
  const dependencies = context.getDependencies();
  return {
    ...ast,
    meta: { type, dependencies }
  };
}

function checkDefinition(ast, context) {
  switch(ast.kind) {
    case "declaration": return checkDeclarationDefinition(ast, context);
    case "constant": return checkConstantDefinition(ast, context);
    case "function": return checkFunctionDefinition(ast, context);
    default: throw new TypeError(`Internal error: unknown AST definition kind ${ast.kind}.`, ast.location);
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
    //case "function": return checkFunction(ast, context);
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
