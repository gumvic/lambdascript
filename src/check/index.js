const generate = require("../generate");
const CheckError = require("./error");
const {
  cast: { value: cast },
  apply: { value: apply },
  tAny: { value: tAny },
  tFromValue: { value: tFromValue },
  tFunction: { value: tFunction },
  tOr: { value: tOr } } = require("monada-core");

class Context {
  constructor(parent) {
    this.parent = parent;
    this.defined = {};
  }

  define(name, data) {
    return this.defined[name] = data;
  }

  getDefinedLocally(name) {
    return this.defined[name];
  }

  getDefined(name) {
    return (
      this.getDefinedLocally(name) ||
      (this.parent && this.parent.getDefined(name)));
  }

  getAllDefined() {
    return {
      ...((this.parent && this.parent.getAllDefined()) || {}),
      ...this.defined
    };
  }

  spawn() {
    return new Context(this);
  }

  global() {
    return (!this.parent && this) || this.parent.global();
  }
}

function declare({ name, location }, newData, context) {
  const oldData = context.getDefinedLocally(name) || {};
  if (oldData.declared) {
    throw new CheckError(`Already declared: ${name}`, location);
  }
  else if (oldData.type && newData.type && !cast(oldData.type, newData.type)) {
    throw new CheckError(`Can't cast ${newData.type} to ${oldData.type}`, location);
  }
  else {
    return context.define(name, {
      ...oldData,
      ...newData,
      declared: true
    });
  }
}

function define({ name, location }, newData, context) {
  const oldData = context.getDefinedLocally(name) || {};
  if (oldData.defined) {
    throw new CheckError(`Already defined: ${name}`, location);
  }
  else if (oldData.type && newData.type && !cast(oldData.type, newData.type)) {
    throw new CheckError(`Can't cast ${newData.type} to ${oldData.type}`, location);
  }
  else {
    return context.define(name, {
      ...oldData,
      ...newData,
      defined: true
    });
  }
}

function getDeclared({ name, location }, context) {
  const data = context.getDefined(name) || {};
  if (!data.declared) {
    throw new CheckError(`Not declared: ${name}`, location);
  }
  else {
    return data;
  }
}

function getDefined({ name, location }, context) {
  const data = context.getDefined(name) || {};
  if (!data.defined) {
    throw new CheckError(`Not defined: ${name}`, location);
  }
  else {
    return data;
  }
}

// TODO refactor
function eval(ast, context) {
  let argNames = [];
  let argValues = [];
  const defined = context.getAllDefined();
  for(let argName in defined) {
    argNames.push(generate({
      type: "name",
      name: argName
    }));
    argValues.push(defined[argName].value);
  }
  const body = `return ${generate(ast)}`;
  try {
    return Function(...argNames, body)(...argValues);
  }
  catch(e) {
    throw new CheckError(e.message, ast.location);
  }
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
    $type: getDefined(ast, context).type
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
          define(ast.args[i], { type: args[i] }, context);
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
          define(ast.args[i], { type: args[i] }, context);
        }
        return check(ast.body, _context).$type;No
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
  return tFunction(...args, res);
}

function checkFunction(ast, context) {
  return {
    ...ast,
    $type: lambdaFunctionType(ast, context)
  };
}

function checkCall(ast, context) {
  const callee = check(ast.callee, context).$type;
  const args = ast.args.map((arg) => check(arg, context).$type);
  const type = apply(callee, args);
  if (!type) {
    throw new CheckError(`Can't apply ${callee} to (${args.map((t) => t.toString()).join(", ")})`, ast.location);
  }
  else {
    return {
      ...ast,
      $type: type
    };
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
    const results = [
      ...branches.map(({ value }) => check(value, context)),
      check(ast.otherwise, context)
    ];
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
  define(ast.name, { type }, context);
  return {
    ...ast,
    $type: type
  };
}

function checkFunctionDefinition(ast, context) {
  const type = getDefined(ast.name, context).type;
  const _type = namedFunctionType(ast, context);
  if (!cast(type, _type)) {
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
  const globalContext = context.global();
  for(let { name, typeExpression, location } of declarations) {
    // TODO check typeExpression
    // TODO check that typeExpression's type is castable to type, i. e., has castTo/castFrom etc
    // typeExpression = check(typeExpression, globalContext);
    const type = eval(typeExpression, globalContext);
    declare(name, { typeExpression, type }, context);
  }

  const functions = definitions.filter(({ kind }) => kind === "function");
  for(let { name } of functions) {
    const type = getDeclared(name, context).type;
    define(name, { type }, context);
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
      define(name, { type: entry.type, value: entry.value }, context);
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

function checkImports(imports, context) {
  return imports.map((_import) => checkImport(_import, context));
}

// TODO check that the type was explicitely declared
function checkExportSome(ast, context) {
  for (let name of ast.names) {
    getDefined(name, context);
  }
  return ast;
}

// TODO
function checkExportAll(ast, context) {
  return ast;
}

function checkExport(ast, context) {
  if (!ast) {
    return ast;
  }
  else {
    switch(ast.kind) {
      case "some": return checkExportSome(ast, context);
      case "all": return checkExportAll(ast, context);
      default: throw new CheckError(`Internal error: unknown AST import kind ${ast.kind}.`, ast.location);
    }
  }
}

function checkModule(ast, context) {
  return {
    ...ast,
    imports: checkImports(ast.imports, context),
    definitions: checkDefinitions(ast.definitions, context),
    export: checkExport(ast.export, context)
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
    case "module": return checkModule(ast, context);
    default: throw new TypeError(`Internal error: unknown AST type ${ast.type}.`);
  }
}

module.exports = function(ast) {
  return check(ast, new Context());
};
