const generate = require("../generate");
const CheckError = require("./error");
const {
  FUNCTION: { value: FUNCTION },
  AND: { value: AND },
  OR: { value: OR },
  cast: { value: cast },
  readable: { value: readable },
  tNone: { value: tNone },
  tAny: { value: tAny },
  tUndefined: { value: tUndefined },
  tNull: { value: tNull },
  tBoolean: { value: tBoolean },
  tNumber: { value: tNumber },
  tString: { value: tString },
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
    throw new CheckError(`Can not cast ${readable(newData.type)} to ${readable(oldData.type)}`, location);
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
    throw new CheckError(`Can not cast ${readable(newData.type)} to ${readable(oldData.type)}`, location);
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
    $type: tUndefined
  };
}

function checkNull(ast, context) {
  return {
    ...ast,
    $type: tNull
  };
}

function checkFalse(ast, context) {
  return {
    ...ast,
    $type: tBoolean(false)
  };
}

function checkTrue(ast, context) {
  return {
    ...ast,
    $type: tBoolean(true)
  };
}

function checkNumber(ast, context) {
  return {
    ...ast,
    $type: tNumber(parseFloat(ast.value))
  };
}

function checkString(ast, context) {
  return {
    ...ast,
    $type: tString(ast.value)
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

// TODO copy all of the context's contents, then spawn off of that
function checkFunction(ast, context) {
  const args = ast.args.map((_) => tNone);
  function fn(...args) {
    const _context = context.spawn();
    for(let i = 0; i < args.length; i++) {
      define(ast.args[i], { type: args[i] }, _context);
    }
    try {
      return check(ast.body, _context).$type;
    }
    catch(e) {
      if (e instanceof CheckError) {
        return undefined;
      }
      else {
        throw e;
      }
    }
  }
  fn.readable = ast.text;
  const type = tFunction(...args, fn);
  return {
    ...ast,
    $type: type
  };
}

function checkCall(ast, context) {
  function _check(callee, args) {
    switch(callee.type) {
      case OR:
        let types = [];
        for (let type of callee.types) {
          const res = _check(type, args);
          if (!res) {
            return false;
          }
          else {
            types.push(res);
          }
        }
        return tOr(...types);
      case AND:
        for (let type of callee.types) {
          const res = _check(type, args);
          if (res) {
            return res;
          }
        }
        return false;
      case FUNCTION:
        return callee.fn(...args);
      default: return undefined;
    }
  }
  const callee = check(ast.callee, context).$type;
  const args = ast.args.map((arg) => check(arg, context).$type);
  const type = _check(callee, args);
  if (!type) {
    throw new CheckError(`Can not apply ${readable(callee)} to (${args.map(readable).join(", ")})`, ast.location);
  }
  else {
    return {
      ...ast,
      $type: type
    };
  }
}

function checkCase(ast, context) {
  const branchTypes = ast.branches.map(({ condition, value }) => {
    check(condition, context);
    return check(value, context).$type;
  });
  const otherwiseType = check(ast.otherwise, context).$type;
  const type = tOr(...branchTypes, otherwiseType);
  return {
    ...ast,
    $type: type
  };
}

// TODO refactor
function checkMatch(ast, context) {
  function narrow(orType, patternType) {
    for(let type of orType.types) {
      if (cast(patternType, type)) {
        return type;
      }
    }
    return undefined;
  }
  const names = ast.names;
  const nameTypes = ast.names.map((name) => {
    const type = getDefined(name, context).type;
    if (type.type !== OR) {
      throw new CheckError(`Not an or: ${readable(type)}`, name.location);
    }
    else {
      return type;
    }
  });
  const branchTypes = ast.branches.map(({ patterns, value }) => {
    const _context = context.spawn();
    for(let i = 0; i < names.length; i++) {
      const name = names[i];
      const pattern = patterns[i];
      const nameType = nameTypes[i];
      const patternType = eval(pattern, context.global());
      const type = narrow(nameType, patternType);
      if (!type) {
        throw new CheckError(`Can not narrow ${readable(nameType)} to ${readable(patternType)}`, pattern.location);
      }
      else {
        define(name, { type }, _context);
      }
    }
    return check(value, _context).$type;
  });
  const otherwiseType = check(ast.otherwise, context).$type;
  const type = tOr(...branchTypes, otherwiseType);
  return {
    ...ast,
    $type: type
  };
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
  function _check(declaredType) {
    switch(declaredType.type) {
      case OR:
        let errors = [];
        for (let type of declaredType.types) {
          try {
            _check(type);
            return;
          }
          catch(e) {
            if (e instanceof CheckError) {
              errors.push(e);
            }
            else {
              throw e;
            }
          }
        }
        throw errors[0];
      case AND:
        for (let type of declaredType.types) {
          _check(type);
        }
        return;
      case FUNCTION:
        if (declaredType.args.length !== ast.args.length) {
          throw new CheckError(`Declared arity ${declaredType.args.length} does not match actual arity ${ast.args.length}`, ast.location);
        }
        else {
          const _context = context.spawn();
          for(let i = 0; i < ast.args.length; i++) {
            define(ast.args[i], { type: declaredType.args[i] }, _context);
          }
          const res = check(ast.body, _context).$type;
          if (!cast(declaredType.res, res)) {
            throw new CheckError(`Can not cast ${readable(res)} to ${readable(declaredType.res)}`, ast.body.location);
          }
        }
        return;
      default:
        throw new CheckError(`Declared type is not a function: ${readable(declaredType)}`, ast.location);
    }
  }
  const declaredType = getDefined(ast.name, context).type;
  _check(declaredType);
  return {
    ...ast,
    $type: declaredType
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
  for(let { name, typeExpression, location } of declarations) {
    // TODO check typeExpression
    // TODO check that typeExpression's type is castable to type, i. e., has castTo/castFrom etc
    // typeExpression = check(typeExpression, globalContext);
    const type = eval(typeExpression, context.global());
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
    case "match": return checkMatch(ast, context);
    case "scope": return checkScope(ast, context);
    case "module": return checkModule(ast, context);
    default: throw new TypeError(`Internal error: unknown AST type ${ast.type}.`);
  }
}

module.exports = function(ast) {
  return check(ast, new Context());
};
