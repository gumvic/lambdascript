#!/usr/bin/env node

const { EOL } = require("os");
const immutable = require("immutable");
const parse = require("./src/parse");
const check = require("./src/check");
const generate = require("./src/generate");

function cast(to, from) {
  return to.cast(from);
}

const tAny = {
  example() {
    return {
      type: "any"
    };
  },
  cast(other) {
    return true;
  },
  toString() {
    return "*";
  }
};

function tPrimitive(type, value) {
  return {
    example() {
      return {
        type,
        value
      };
    },
    cast(other) {
      const { type: otherType, value: otherValue } = other.example();
      return (
        (type === otherType) &&
        (value === undefined || value === otherValue));
    },
    toString() {
      return value === undefined ? type : `${type}(${value})`;
    }
  };
}

function tVariant(...types) {
  return {
    example() {
      return {
        type: "variant",
        types
      };
    },
    cast(other) {
      const { type: otherType, types: otherTypes } = other.example();
      if (otherType === "variant") {
        const type = variant(...types);
        for (let _other of otherTypes) {
          if (!cast(type, _other)) {
            return false;
          }
        }
        return true;
      }
      else {
        for (let type of types) {
          if (cast(type, other)) {
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

function tFunction(...args) {
  function castArgs(_args) {
    if (_args.length !== args.length) {
      return false;
    }
    else {
      for (let i = 0; i < _args.length; i++) {
        if (!cast(args[i], _args[i])) {
          return false;
        }
      }
      return true;
    }
  }
  function ensureFn(x) {
    return typeof x === "function" ?
      (...args) => x(...args) :
      () => x;
  }
  const res = args.pop();
  const resFn = ensureFn(res);
  const fn = (...args) => castArgs(args) && resFn(...args);
  return {
    example() {
      return {
        type: "function",
        fn
      };
    },
    cast(other) {
      const { type: otherType, fn: otherFn } = other;
      if (otherType === "function") {
        const res = resFn(...args);
        const otherRes = otherFn(...args);
        return res && otherRes && cast(res, otherRes);
      }
      else {
        return false;
      }
    },
    toString() {
      return `fn(${args.map((arg) => arg.toString()).join(", ")}) -> ${res.toString()}`;
    }
  };
};

const tUndefined = tPrimitive("undefined");
const tNull = tPrimitive("null");
const tFalse = tPrimitive("false");
const tTrue = tPrimitive("true");
const tBoolean = tVariant(tFalse, tTrue);
const tNumber = tPrimitive("number");
const tString = tPrimitive("string");

function initEnvironment() {
  global.monada$meta = {
    print: {
      type: tFunction(tAny, tUndefined)
    }
  };
  global.immutable = immutable;
  global.tUndefined = tUndefined;
  global.tNull = tNull;
  global.tFalse = tFalse;
  global.tTrue = tTrue;
  global.tBoolean = tBoolean;
  global.tNumber = tNumber;
  global.tString = tString;
  global.tPrimitive = tPrimitive;
  global.print = (x) => console.log(x);
}

function formatError(e, src) {
  if (e.location) {
    const line = e.location.start.line - 1;
    const column = e.location.start.column;
    return [e.message, src.split(EOL)[line], "^".padStart(column)].join(EOL);
  }
  else {
    return e.stack;
  }
}

function repl(src) {
  try {
    const js =
      generate(
        check(
          parse(src)));
    eval(js);
  }
  catch(e) {
    console.log(formatError(e, src));
  }
}

function run() {
  initEnvironment();
  repl(`print(42)`);
}

run();
