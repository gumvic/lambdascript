const CheckError = require("./error");
const {
  castType: { value: castType },
  readableType: { value: readableType },
  tAny: { value: tAny },
  tFromValue: { value: tFromValue },
  tFunction: { value: tFunction },
  tOr: { value: tOr } } = require("monada-core");

class Context {
  constructor(parent) {
    this.parent = parent;
    this.declared = {};
    this.defined = {};
  }

  declare(name, value) {
    return this.declared[name] = value;
  }

  getDeclared(name) {
    return this.declared[name];
  }

  define(name, value) {
    return this.defined[name] = value;
  }

  getDefined(name) {
    return (
      this.getDefinedLocally(name) ||
      (this.parent && this.parent.getDefined(name)));
  }

  getDefinedLocally(name) {
    return this.defined[name];
  }

  spawn() {
    return new Context(this);
  }
}

function declare({ name, location }, TODO, context) {
  // TODO if defined, try to cast types
  throw new CheckError(`Already declared: ${name}`, location);
}

function getDeclared({ name }, context) {
  return context.getDeclared(name);
}

function define({ name, location }, type, context) {
  // TODO if declared, try to cast types
  if (context.getDefinedLocally(name)) {
    throw new CheckError(`Already defined: ${name}`, location);
  }
  else {
    return context.define(name, type);
  }
}

function getDefined({ name, location }, context) {
  const defined = context.getDefined(name);
  if (defined) {
    return defined;
  }
  else {
    throw new CheckError(`Not defined: ${name}`, location)
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
    $type: tFromValue(undefined)
  };
}

function checkNull(ast, context) {
  return {
    ...ast,
    $type: tFromValue(null)
  };
}

function checkFalse(ast, context) {
  return {
    ...ast,
    $type: tFromValue(false)
  };
}

function checkTrue(ast, context) {
  return {
    ...ast,
    $type: tFromValue(true)
  };
}

function checkNumber(ast, context) {
  return {
    ...ast,
    $type: tFromValue(parseFloat(ast.value))
  };
}

function checkString(ast, context) {
  return {
    ...ast,
    $type: tFromValue(ast.value)
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
    $type: getDefined(ast, context)
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
          define(ast.args[i], args[i], context);
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
          define(ast.args[i], args[i], context);
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
  const args = ast.args.map((_) => tAny);
  const res = tAny;
  return tFunction(...args.concat(res));
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
    const readableCalleeType = readableType(calleeType);
    const readableArgTypes = argTypes.map(readableType);
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
      $type: tOr(...results.map(({ $type }) => $type))
    };
  }
}

function checkScope(ast, context) {
  context = context.spawn();
  checkDefinitions(ast.definitions, context);
  const body = check(ast.body, context);
  return {
    ...ast,
    $type: body.$type
  };
}

function checkDeclarationDefinition(ast, context) {
  return ast;
}

function checkConstantDefinition(ast, context) {
  const value = check(ast.value, context);
  const type = value.$type;
  define(ast.name, type, context);
  return {
    ...ast,
    $type: type
  };
}

function checkFunctionDefinition(ast, context) {
  const type = getDefined(ast.name, context);
  const _type = namedFunctionType(ast, context);
  if (!castType(type, _type)) {
    throw new CheckError(`Can't cast ${_type.readable} to ${type.readable}`, ast.location);
  }
  return {
    ...ast,
    $type: type
  };
}

function checkDefinition(ast, context) {
  switch(ast.kind) {
    case "declaration": return checkDeclarationDefinition(ast, context);
    case "constant": return checkConstantDefinition(ast, context);
    case "function": return checkFunctionDefinition(ast, context);
    default: throw new CheckError(`Internal error: unknown AST definition kind ${ast.kind}.`, ast.location);
  }
}

// TODO dangling declarations
function checkDefinitions(definitions, context) {
  const declarations = definitions.filter(({ kind }) => kind === "declaration");
  for(let { name, typed } of declarations) {
    declare(name, typed, context);
  }

  const functions = definitions.filter(({ kind }) => kind === "function");
  for(let { name, location } of functions) {
    const type = getDeclared(name, context);
    if (!type) {
      throw new CheckError(`Missing type declaration`, location);
    }
    else {
      define(name, type, context);
    }
  }

  for(let definition of definitions) {
    checkDefinition(definition, context);
  }

  return definitions;
}

function checkImportSome(ast, context) {
  for(let name of ast.names) {
    const entry = ast.$module[name.name];
    if (!entry) {
      throw new CheckError(`${ast.module.name} doesn't export ${name.name}`, name.location);
    }
    else {
      define(name, entry.type, context);
    }
  }
  return ast;
}

function checkImportAll(ast, context) {
  const names = Object.keys(ast.$module)
    .map((name) => ({
      type: "name",
      name
    }));
  return checkImportSome({ ...ast, names }, context);
}

function checkImport(ast, context) {
  switch(ast.kind) {
    case "some": return checkImportSome(ast, context);
    case "all": return checkImportAll(ast, context);
    default: throw new CheckError(`Internal error: unknown AST import kind ${ast.kind}.`, ast.location);
  }
}

function checkExportSome(ast, context) {
  for (let name of ast.names) {
    getDefined(name, context);
  }
  return ast;
}

function checkExportAll(ast, context) {
  return ast;
}

function checkExport(ast, context) {
  switch(ast.kind) {
    case "some": return checkExportSome(ast, context);
    case "all": return checkExportAll(ast, context);
    default: throw new CheckError(`Internal error: unknown AST import kind ${ast.kind}.`, ast.location);
  }
}

function checkModule(ast, context) {
  for (let _import of ast.imports) {
    checkImport(_import, context);
  }
  checkDefinitions(ast.definitions, context);
  if (ast.export) {
    checkExport(ast.export, context);
  }
  return ast;
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
    case "module": return checkModule(ast, context);
    default: throw new TypeError(`Internal error: unknown AST type ${ast.type}.`);
  }
}

module.exports = function(ast) {
  return check(ast, new Context());
};
