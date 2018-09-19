function castType(to, from) {
  if (to.type === "none" ||
      from.type === "none") {
    return true;
  }
  else if (to.type === "any") {
    return true;
  }
  else if (to.type === "and") {
    for (let _to of to.types) {
      if (!castType(_to, from)) {
        return false;
      }
    }
    return true;
  }
  else if (from.type === "and") {
    for (let _from of from.types) {
      if (castType(to, _from)) {
        return true;
      }
    }
    return false;
  }
  else if (to.type === "or") {
    for (let _to of to.types) {
      if (castType(_to, from)) {
        return true;
      }
    }
    return false;
  }
  else if (from.type === "or") {
    for (let _from of from.types) {
      if (!castType(to, _from)) {
        return false;
      }
    }
    return true;
  }
  else if (
    to.type === "undefined" &&
    from.type === "undefined") {
    return true;
  }
  else if (
    to.type === "null" &&
    from.type === "null") {
    return true;
  }
  else if (
    to.type === "boolean" ||
    to.type === "number" ||
    to.type === "string") {
    return to.value === undefined ?
      to.type === from.type :
      (to.type === from.type && to.value === from.value);
  }
  else if (
    to.type === "function" &&
    from.type === "function") {
    const fromRes = from.fn(...to.args);
    return fromRes && castType(to.res, fromRes);
  }
  else {
    return false;
  }
}

// TODO better name
function matchType(type, value) {
  switch(type.type) {
    case "none": return true;
    case "any": return true;
    case "undefined": return value === undefined;
    case "null": return value === null;
    case "boolean": return type.value ? type.value === value : typeof value === "boolean";
    case "number": return type.value ? type.value === value : typeof value === "number";
    case "string": return type.value ? type.value === value : typeof value === "string";
    // TODO typeof value === "function" -- and that's all?
    case "function": return typeof value === "function";
    case "and":
      for (let _type of type.types) {
        if (!match(_type, value)) {
          return false;
        }
      }
      return true;
    case "or":
      for (let _type of type.types) {
        if (match(_type, value)) {
          return true;
        }
      }
      return false;
    default: return false;
  }
}

const typeNone = {
  type: "none",
  toString() {
    return "?";
  }
};

const typeAny = {
  type: "any",
  toString() {
    return "*";
  }
};

const typeUndefined = {
  type: "undefined",
  toString() {
    return "undefined";
  }
};

const typeNull = {
  type: "null",
  toString() {
    return "null";
  }
};

function typeBoolean(value) {
  return {
    type: "boolean",
    value,
    toString() {
      return value ? `boolean(${value})` : "boolean";
    }
  };
}
typeBoolean.type = "boolean";
typeBoolean.toString = () => "boolean";

function typeNumber(value) {
  return {
    type: "number",
    value,
    toString() {
      return value ? `number(${value})` : "number";
    }
  };
}
typeNumber.type = "number";
typeNumber.toString = () => "number";

function typeString(value) {
  return {
    type: "string",
    value,
    toString() {
      return value ? `string(${value})` : "string";
    }
  };
}
typeString.type = "string";
typeString.toString = () => "string";

function typeFunction(args, res, fn, readable) {
  fn = fn || ((..._) => res);
  return {
    type: "function",
    args,
    res,
    fn(..._args) {
      if (_args.length !== args.length) {
        return undefined;
      }
      for (let i = 0; i < _args.length; i++) {
        if (!castType(args[i], _args[i])) {
          return undefined;
        }
      }
      return fn(..._args);
    },
    toString() {
      return readable || `fn(${args.join(", ")}) -> ${res}`;
    }
  };
}
// TODO typeFunction should represent any function?
// or simply let cast deal with the fact that args/res/fn might be empty, like for typeNumber a value might be empty?
//typeFunction.type = FUNCTION;
//typeFunction.args = ?
//typeFunction.res = typeNone;
//typeFunction.fn = (..._) => typeNone;

function typeAnd(...types) {
  return {
    type: "and",
    types,
    toString() {
      return `(${types.join(" & ")})`;
    }
  };
}

function typeOr(...types) {
  return {
    type: "or",
    types,
    toString() {
      return `(${types.join(" | ")})`;
    }
  };
}

module.exports = {
  "cast-type": {
    type: typeNone,
    value: castType
  },
  "match-type": {
    type: typeNone,
    value: matchType
  },
  "type-none": {
    type: typeNone,
    value: typeNone
  },
  "type-any": {
    type: typeNone,
    value: typeAny
  },
  "type-undefined": {
    type: typeNone,
    value: typeUndefined
  },
  "type-null": {
    type: typeNone,
    value: typeNull
  },
  "type-boolean": {
    type: typeNone,
    value: typeBoolean
  },
  "type-number": {
    type: typeNone,
    value: typeNumber
  },
  "type-string": {
    type: typeNone,
    value: typeString
  },
  "type-function": {
    type: typeNone,
    value: typeFunction
  },
  "type-and": {
    type: typeNone,
    value: typeAnd
  },
  "type-or": {
    type: typeNone,
    value: typeOr
  }
};
