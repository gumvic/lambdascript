#!/usr/bin/env node

const { EOL } = require("os");
const immutable = require("immutable");
const get = immutable.get;
const { namify } = require("./src/utils");
const parse = require("./src/parse");
const check = require("./src/check");
const generate = require("./src/generate");

/*function cast(to, from) {
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
};*/

function cast(to, from) {
  return to.castFrom(from);
}

const tAny = {
  type: "any",
  castFrom(other) {
    return true;
  },
  toString() {
    return "*";
  }
};

function tPrimitive(type, value) {
  return {
    type,
    value,
    castFrom(other) {
      const otherType = get(other, "type");
      const otherValue = get(other, "value");
      return (
        (type === otherType) &&
        (value === undefined || value === otherValue));
    },
    toString() {
      return value === undefined ? type : `${type}(${value})`;
    }
  };
}

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
    type: "function",
    fn,
    castFrom(other) {
      const otherType = get(other, "type");
      if (otherType === "function") {
        const otherFn = get(other, "fn");
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

function tVariant(...types) {
  function castFrom(other) {
    const otherType = get(other, "type");
    if (otherType === "variant") {
      const otherTypes = get(other, "types");
      for (let _other of otherTypes) {
        if (!castFrom(_other)) {
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
  }
  return {
    type: "variant",
    types,
    castFrom,
    toString() {
      return `(${types.map((type) => type.toString()).join(" | ")})`;
    }
  };
}

function define(name, value, meta) {
  global.monada$meta[name] = meta || {};
  global[namify(name)] = value;
  return value;
}

function getMeta(name) {
  return global.monada$meta[name];
}

function compile(src) {
  const parsed = parse(src);
  const checked = check(parsed);
  const generated = generate(checked);
  return eval(generated);
}

function initEnvironment() {
  global.monada$meta = {};

  define("define", define);
  define("getMeta", getMeta);
  define("compile", compile);

  define("immutable", immutable);

  define("tAny", tAny);
  define("tUndefined", tPrimitive("undefined"));
  define("tNull", tPrimitive("null"));
  define("tFalse", tPrimitive("false"));
  define("tTrue", tPrimitive("true"));
  define("tBoolean", tVariant(tPrimitive("false"), tPrimitive("true")));
  define("tNumber", tPrimitive("number"));
  define("tString", tPrimitive("string"));
  define("tPrimitive", tPrimitive);

  define("print", (x) => console.log(x), {
    type: tFunction(tAny, tUndefined)
  });
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
    compile(src);
  }
  catch(e) {
    console.log(formatError(e, src));
  }
}

function run() {
  initEnvironment();
  //repl(`print(42)`);
  //repl(`print(print(42), null)`);
  //repl(`x = 42`);
  //repl(`print(x)`);
  repl(`
    let
      x = print(42)
    in
      print(x(x))
    end`);
}

run();
