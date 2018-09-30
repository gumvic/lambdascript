const {
  typeAny,
  typeUndefined,
  typeNull,
  typeBoolean,
  typeNumber,
  typeString
} = require("../utils");
const { namify } = require("../utils");

function typeOf(x) {
  switch(typeof x) {
    case "undefined": return typeUndefined;
    case "boolean": return typeBoolean(x);
    case "number": return typeNumber(x);
    case "string": return typeString(x);
    case "function": return x.$type || typeAny;
    default:
    if (x === null) {
      return typeNull;
    }
    else {
      return typeAny;
    }
  }
}

function symbols() {
  return global.$monada.symbols;
}

/*function define(name, data) {
  const oldData = symbols().byName[name] || {
    dependencies: [],
    dependants: []
  };
  const newData = {
    dependencies: [],
    dependants: [],
    ...data
  };
  for (let dependencyName of oldData.dependencies) {
    if (dependencyName !== name &&
        newData.dependencies.indexOf(dependencyName) < 0) {
      const dependency = getDefined(dependencyName);
      if (dependency) {
        dependency.dependants = dependency.dependants
          .filter((dependantName) => dependantName !== name);
      }
    }
  }
  for (let dependencyName of newData.dependencies) {
    if (dependencyName !== name &&
        oldData.dependencies.indexOf(dependencyName) < 0) {
      const dependency = getDefined(dependencyName);
      if (dependency &&
          dependency.dependants.indexOf(name) < 0) {
        dependency.dependants.push(name);
      }
    }
  }
  symbols().byName[name] = { ...oldData, ...newData };
  return global[namify(name)] = newData.value;
}*/

function define(name, data) {
  /*const dependants = symbols().byDependencyName[name];
  Object.keys(dependants)
    .map((name) => dependants[name].type)
    .forEach();*/
  /*for (let dependencyName of data.dependencies) {
    let dependants = symbols().byDependencyName[dependencyName];
    if (dependants.indexOf(name) < 0) {
      dependants.push(name);
    }
  }*/
  const oldData = symbols().byName[name] || {};
  global[namify(name)] = data.value;
  return symbols().byName[name] = {
    ...oldData,
    ...data
  };
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
  define,
  getDefined,
  load
};
