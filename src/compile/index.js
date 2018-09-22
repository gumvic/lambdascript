const {
  "define": { value: define }
} = require("../core/meta");
const parse = require("../parse");
const check = require("../check");
const generate = require("../generate");

function compile(src) {
  try {
    const ast = check(parse(src));
    const js = generate(ast);
    const type = ast.typeValue;
    const value = eval(js);
    if (ast.type === "definition") {
      define(ast.name.name, {
        type,
        value
      });
    }
    return {
      type,
      value
    };
  }
  catch(error) {
    return {
      error
    };
  }
}

module.exports = compile;
