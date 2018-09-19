const {
  "type-none": { value: typeNone }
} = require("./types");
const { namify } = require("../utils");

function symbols() {
  return global.$monada.symbols;
}

function define(name, data) {
  const oldData = symbols().byName[name] || {};
  symbols().byName[name] = { ...oldData, ...data };
  global[namify(name)] = data.value;
}

function defined(name) {
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

function init() {
  global.$monada = {
    symbols: {
      byName: {}
    }
  };
}

init();

module.exports = {
  "define": {
    type: typeNone,
    value: define
  },
  "defined": {
    type: typeNone,
    value: defined
  },
  "begin-module": {
    type: typeNone,
    value: beginModule
  },
  "end-module": {
    type: typeNone,
    value: endModule
  }
};
