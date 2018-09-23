const { define } = require("../meta");
const { parse } = require("./parse");
const { check } = require("./check");
const { generate } = require("./generate");

function compile(src) {
  try {
    const ast = check(parse(src));
    const js = generate(ast);
    const value = eval(js);
    if (ast.type === "definition") {
      define(ast.name.name, {
        value,
        ast,
        ...ast.meta
      });
    }
    return {
      type: ast.meta.type,
      value
    };
  }
  catch(error) {
    return {
      error
    };
  }
}

module.exports = {
  parse,
  check,
  generate,
  compile
};
