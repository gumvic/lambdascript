const { namify } = require("../utils");

function symbols() {
  return global.$monada.symbols;
}

function symbol(name, data) {
  if (data === undefined) {
    return symbols().byName[name];
  }
  else {
    const oldData = symbols().byName[name] || {};
    if (oldData.constant) {
      // TODO
    }
    else {
      global[namify(name)] = data.value;
      return symbols().byName[name] = {
        ...oldData,
        ...data
      };
    }
  }
}

function load(name) {
  // TODO if file exists and it's .monada, load monada
  // otherwise:
  const module = require(name);
  Object.keys(module).forEach((name) => {
    const value = module[name];
    symbol(name, {
      value,
      constant: true
    });
  });
}

function init() {
  global.$monada = {
    symbols: {
      byName: {},
      byDependencyName: {}
    }
  };
}

init();

module.exports = {
  symbol,
  load
};
