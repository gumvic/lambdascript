const CheckError = require("./error");

class Context {
  constructor(parent) {
    this.parent = parent;
  }

  spawn() {
    return new Context(this);
  }
}

function checkUndefined(ast, context) {
  return {
    type: scalar("undefined"),
    context: context
  };
}

function checkNull(ast, context) {
  return {
    type: scalar("null"),
    context: context
  };
}

function checkFalse(ast, context) {
  return {
    type: scalar("false"),
    context: context
  };
}

function checkTrue(ast, context) {
  return {
    type: scalar("true"),
    context: context
  };
}

function checkNumber(ast, context) {
  return {
    type: scalar("number"),
    context: context
  };
}

function checkString(ast, context) {
  return {
    type: scalar("string"),
    context: context
  };
}

function checkName(ast, context) {
  return {
    type: defined(ast, context),
    context: context
  };
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
  //return check(ast, context);
};
