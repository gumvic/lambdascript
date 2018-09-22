const { namify } = require("../utils");
const { typeof: typeOf } = require("../type");
function symbols() {
  return global.$monada.symbols;
}

function define(name, data) {
  // TODO check if frozen?
  const oldData = symbols().byName[name] || {};
  symbols().byName[name] = { ...oldData, ...data };
  return global[namify(name)] = data.value;
}

function getDefined(name) {
  return symbols().byName[name];
}

// TODO can't have nested modules with this approach using just one previousModuleName variable
//let previousModule;
function beginModule(name) {
  // TODO
  /*previousModule = global.$monada.currentModule;
  global.$monada.currentModule = {
    name
  };*/
}

function endModule() {
  // TODO
  //global.$monada.currentModule = previousModule;
  //previousModuleName = undefined;
}

function load(name) {
  // TODO if file exists and it's .monada, load monada
  // otherwise:
  const module = require(name);
  Object.keys(module).forEach((name) => {
    const value = module[name];
    define(name, {
      type: typeOf(value),
      value,
      frozen: true
    });
  });
}

function init() {
  global.$monada = {
    symbols: {
      byName: {}
    }
  };
}

init();

module.exports = {
  define,
  getDefined,
  load
};
