#!/usr/bin/env node

const immutable = require("immutable");
const parse = require("./src/parse");
const check = require("./src/check");
const generate = require("./src/generate");

/*const tAny = {
  type: "any",
  description: "*",
  check() {
    return true;
  }
};

function tPrimitive(type, description) {
  return {
    type,
    description,
    check({ type: _type }) {
      return _type === type;
    }
  };
}

const tNumber = tPrimitive("number", "number");

function tPrimitiveValue(value) {

}

function tVariant(types) {
  return {
    type: "variant",
    types: types,
    description: `(${types.map(({ description }) => description).join(" | ")})`,
    check(type) {
      if (type.type === "variant") {
        for(let _type of type.types) {

        }
      }
      else {

      }
    }
  };
}*/

const tAny = {
  example() {
    return {
      type: "any"
    };
  },
  check(other) {
    return true;
  },
  toString() {
    return "*";
  }
};

function tPrimitive(type) {
  return {
    example() {
      return {
        type
      };
    },
    check(other) {
      return type === other.example().type;
    },
    toString() {
      return type;
    }
  };
}

const tNumber = tPrimitive("number");
const tString = tPrimitive("string");

function tVariant(...types) {
  return {
    example() {
      return {
        type: "variant",
        types
      };
    },
    check(other) {
      const example = other.example();
      if (example.type === "variant") {
        const type = variant(...types);
        for (let _other of example.types) {
          if (!check(type, _other)) {
            return false;
          }
        }
        return true;
      }
      else {
        for (let type of types) {
          if (check(type, other)) {
            return true;
          }
        }
        return false;
      }
    },
    toString() {
      return `(${types.map((type) => type.toString()).join(" | ")})`;
    }
  };
};

function initEnvironment() {
  global.immutable = immutable;
  global.print = (x) => console.log(x);
}

function repl(src) {
  const js =
    generate(
      check(
        parse(src)));
  eval(js);
}

function run() {
  initEnvironment();
  repl(`print({ "foo": 42 })`);
}

run();
