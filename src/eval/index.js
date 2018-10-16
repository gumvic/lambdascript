const { symbol } = require("../meta");

function evalValue({ js }) {
  return eval(js);
}

function evalDefinition(gen) {
  const name = gen.ast.name.name;
  const value = evalValue(gen);
  const meta = { ...gen.ast.meta, value };
  return symbol(name, meta).value;
}

module.exports = {
  eval: (gen) => {
    switch(gen.ast.type) {
      case "definition": return evalDefinition(gen);
      default: return evalValue(gen);
    }
  }
};
