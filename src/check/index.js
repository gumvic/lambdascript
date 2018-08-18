const CheckError = require("./error");

class GlobalContext {
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
}

function checkUndefined(ast, context) {

}

function checkNull(ast, context) {

}

function checkFalse(ast, context) {

}

function checkTrue(ast, context) {

}

function checkNumber(ast, context) {

}

function checkString(ast, context) {

}

function checkName(ast, context) {

}

function checkScope(ast, context) {

}

function checkFunction(ast, context) {

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
    case "case": return checkCase(ast, context);
    case "scope": return checkScope(ast, context);
    case "call": return checkCall(ast, context);
    default: throw new CheckError(`Internal error: unknown AST type ${ast.type}.`, ast.location);
  }
}

module.exports = function(ast) {
  return ast;
  //return check(ast, new GlobalContext());
};
