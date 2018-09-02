const CheckError = require("./error");
const core = require("../core");

class Context {
  constructor(parent) {
    this.parent = parent;
    this.defined = {};
  }

  define({ name, location }, type) {
    if (this.defined[name]) {
      throw new CheckError(`Already defined: ${name}`, location);
    }
    else {
      this.defined[name] = type;
    }
  }

  getDefined({ name, location }) {
    if (this.defined[name]) {
      this.defined[name];
    }
    else if (this.parent) {
      return this.parent.getDefined({ name, location });
    }
    else {
      throw new CheckError(`Not defined: ${name}`, location);
    }
  }

  spawn() {
    return new Context(this);
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
    $type: core.tFromValue(undefined)
  };
}

function checkNull(ast, context) {
  return {
    ...ast,
    $type: core.tFromValue(null)
  };
}

function checkFalse(ast, context) {
  return {
    ...ast,
    $type: core.tFromValue(false)
  };
}

function checkTrue(ast, context) {
  return {
    ...ast,
    $type: core.tFromValue(true)
  };
}

function checkNumber(ast, context) {
  return {
    ...ast,
    $type: core.tFromValue(parseFloat(ast.value))
  };
}

function checkString(ast, context) {
  return {
    ...ast,
    $type: core.tFromValue(ast.value)
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
    $type: context.getDefined(ast)
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
          _context.define(ast.args[i], args[i]);
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
          _context.define(ast.args[i], args[i]);
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
  const args = ast.args.map((_) => core.tAny);
  const res = core.tAny;
  return core.tFunction(...args.concat(res));
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
    const readableCalleeType = core.readableType(calleeType);
    const readableArgTypes = argTypes.map(core.readableType);
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
      $type: core.tOr(...results.map(({ $type }) => $type))
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

function checkConstantDefinition(ast, context) {
  const value = check(ast.value, context);
  context.define(ast.name, value.$type);
  return ast;
}

function checkFunctionDefinition(ast, context) {
  const type = defaultFunctionType(ast, context);
  const _type = namedFunctionType(ast, context);
  if (!core.castType(type, _type)) {
    throw new CheckError(`Can't cast ${_type.readable} to ${type.readable}`, ast.location);
  }
  context.define(ast.name, type);
  return ast;
}

function checkDefinition(ast, context) {
  switch(ast.kind) {
    case "constant": return checkLocalConstantDefinition(ast, context);
    case "function": return checkLocalFunctionDefinition(ast, context);
    default: throw new CheckError(`Internal error: unknown AST definition kind ${ast.kind}.`, ast.location);
  }
}

function checkDefinitions(definitions, context) {
  // sort: declarations, functions, constants
  // throw on duplicate declarations
  // throw on hanging declarations
  return definitions;
}

function defineImportName(module, name, context) {
  const type = module.$monada ?
    module.$monada.exports[name.name].type :
    core.tFromValue(module[namify(name.name)]);
  context.define(name, type);
}

function checkImportSome(ast, context) {
  for(let name of ast.names) {
    defineImportName(ast.$module, name);
  }
  return ast;
}

function checkImportAll(ast, context) {
  const names = Object.keys(ast.$module);
  for(let name of names) {
    defineImportName(ast.$module, name);
  }
  return ast;
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
    context.getDefined(name);
  }
  return ast;
}

function checkExportAll(ast, context) {
  return ast;
}

function checkModuleExport(ast, context) {
  switch(ast.kind) {
    case "some": return checkExportSome(ast, context);
    case "all": return checkExportAll(ast, context);
    default: throw new CheckError(`Internal error: unknown AST import kind ${ast.kind}.`, ast.location);
  }
}

function checkModule(ast, context) {
  const imports = ast.imports.map((_import) => checkImport(_import, context));
  const definitions = checkDefinitions(definitions, context);
  const exports = ast.exports.map((_export) => checkExport(_export, context));
  return ast;
  /*return {
    ...ast,
    imports,
    definitions,
    exports
  };*/
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
  return ast;
  //return check(ast, new Context());
};
