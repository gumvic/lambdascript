const GenerationError = require("./error");

const defaultOptions = require("../defaultOptions");

class Context {
  constructor(core) {
    this.core = core;
    this._oneOffName = 0;
  }

  oneOffName(name) {
    return `$${name || ""}_${this._oneOffName++}`;
  }
}

function __(str) {
  const indentationLength = 2;
  return str
    .split("\n")
    .map(line => line.padStart(line.length + indentationLength))
    .join("\n");
}

function namify(name) {
  // TODO js reserved words
  return name
    /*.replace(
      /^([A-Za-z0-9_]+)\?$/,
      function(_, match) {
        match = match[0].toUpperCase() + match.slice(1);
        return `is${match}`;
      })*/
    .replace(
      /[\+\-\*\/\>\<\=\%\!\|\&\^\~\?]/g,
      function(match) {
        switch(match) {
          case "+": return "_plus_";
          case "-": return "_dash_";
          case "*": return "_star_";
          case "/": return "_slash_";
          case ">": return "_right_";
          case "<": return "_left_";
          case "=": return "_equals_";
          case "%": return "_percent_";
          case "!": return "_bang_";
          case "|": return "_pipe_";
          case "&": return "_and_";
          case "^": return "_caret_";
          case "~": return "_tilda_";
          case "?": return "_question_";
        }
      });
}

function isBuiltInOperator(name, arity) {
  switch(arity) {
    case 1:
    switch(name) {
      case "+":
      case "-":
      case "~":
      case "!":
      return true;
      default:
      return false;
    }
    case 2:
    switch(name) {
      case "+":
      case "-":
      case "*":
      case "/":
      case "%":
      case ">":
      case "<":
      case ">=":
      case "<=":
      case "|":
      case "&":
      case "^":
      case ">>":
      case "<<":
      case ">>>":
      case "||":
      case "&&":
      return true;
      default:
      return false;
    }
  }
}

function genUndefined(ast, context) {
  return "undefined";
}

function genNull(ast, context) {
  return "null";
}

function genFalse(ast, context) {
  return "false";
}

function genTrue(ast, context) {
  return "true";
}

function genNumber({ value }, context) {
  return value.toString();
}

function genString({ value }, context) {
  return `"${value}"`;
}

function genKey({ value }, context) {
  return `"${namify(value)}"`;
}

function genIdentifier({ name }, context) {
  return namify(name);
}

function genMap({ items, location }, context) {
  items = items
    .map(({ key, value }) => `[${generate(key, context)}, ${generate(value, context)}]`)
    .join(", ");
  return `Map([${items}])`;
}

function genList({ items, location }, context) {
  items = items.map(item => generate(item, context)).join(", ");
  return `List([${items}])`;
}

function genLambda({ args, body, location }, context) {
  return genFunction({
    type: "funcion",
    variants: [{ args, body, location }],
    location: location
  }, context);
}

function genGetter({ keys }, context) {
  const coll = context.oneOffName("coll");
  keys = keys.reduce((coll, key) => {
    const { isDirect } = key;
    key = generate(key, context);
    return isDirect ? `${coll}[${key}]` : `get(${coll}, ${key})`;
  }, coll);
  return `(${coll}) => ${keys}`;
}

/*function genSetter({ keys }, context) {
  const coll = context.oneOffName("coll");
  const value = context.oneOffName("value");
  if (keys.length === 1) {
    const key = generate(keys[0], context);
    return `(${coll}, ${value}) => core.data.set(${coll}, ${key}, ${value})`;
  }
  else {
    keys = keys.map(key => generate(key, context)).join(", ");
    return `(${coll}, ${value}) => core.data.setIn(${coll}, [${keys}], ${value})`;
  }
}*/

function genConstant({ name, value }, context) {
  return `const ${namify(name)} = ${generate(value, context)};`;
}

function genFunctionVariant({ args, body }, context) {
  const arity = args.length;
  body = `return ${generate(body, context)};`;
  if (arity === 0) {
    return [
      `if (arguments.length === ${arity}) {`,
      __(body),
      "}"
    ].join("\n");
  }
  else {
    args = `const [${args.map(namify).join(", ")}] = arguments;`
    return [
      `if (arguments.length === ${arity}) {`,
      __(args),
      __(body),
      "}"
    ].join("\n");
  }
}

function genFunction({ name, variants }, context) {
  const badArity = "throw new TypeError(\"Arity not supported: \" + arguments.length.toString());";
  if (variants.length === 1) {
    const { args, body } = variants[0];
    const arity = args.length;
    const checkArity = [
      `if (arguments.length !== ${arity}) {`,
      __(badArity),
      "}"
    ].join("\n");
    return [
      `function ${name ? namify(name) : ""}(${args.map(namify).join(", ")}) {`,
      __(checkArity),
      __(`return ${generate(body, context)};`),
      "}"
    ].join("\n");
  }
  else {
    variants = variants
      .map(variant => genFunctionVariant(variant, context))
      .join("\nelse ");
    const defaultVariant = [
      "else {",
      __(badArity),
      "}"
    ].join("\n");
    return [
      `function ${name ? namify(name) : ""}() {`,
      __(variants),
      __(defaultVariant),
      "}"
    ].join("\n");
  }
}

function genDo({ items }, context) {
  function _generate(items) {
    if (!items.length) {
      return null;
    }
    else {
      const left = items[0];
      const right = _generate(items.slice(1));
      if (!right) {
        return {
          type: "call",
          fun: {
            type: "identifier",
            name: "monad"
          },
          args: [left.value]
        };
      }
      else {
        return {
          type: "call",
          fun: {
            type: "identifier",
            name: "monad"
          },
          args: [
            left.value,
            {
              type: "lambda",
              args: [left.via || "_"],
              body: right
            }
          ]
        };
      }
    }
  }
  return generate(_generate(items), context);
}

function genCase({ branches, otherwise }, context) {
  function f(branches, context) {
    if (!branches.length) {
      return generate(otherwise, context);
    }
    const { condition, value } = branches[0];
    const rest = branches.slice(1);
    const _condition = generate(condition, context);
    const ifTrue = generate(value, context);
    const ifFalse = f(rest, context);
    return [
      `(${_condition} ?`,
      __(`${ifTrue} :`),
      __(`${ifFalse})`)
    ].join("\n");
  }
  return f(branches, context);
}

function genLet({ definitions, body }, context) {
  definitions = definitions
    .map(definition => generate(definition, context))
    .join("\n");
  body = generate(body, context);
  return [
    "((() => {",
    __(definitions),
    __(`return ${body};`),
    "})())"
  ].join("\n");
}

function genCall(ast, context) {
  const { fun, args } = ast;
  if (fun.type === "identifier" &&
      isBuiltInOperator(fun.name, args.length)) {
    return genOperatorCall(ast, context);
  }
  else {
    return genFunctionCall(ast, context);
  }
}

function genOperatorCall({ fun: { name }, args }, context) {
  if (args.length === 1) {
    const left = generate(args[0], context);
    return `${name}${left}`;
  }
  else if (args.length === 2) {
    const left = generate(args[0], context);
    const right = generate(args[1], context);
    return `${left} ${name} ${right}`;
  }
}

function genFunctionCall({ fun, args }, context) {
  // TODO wrap in braces values that js won't call
  fun = generate(fun, context);
  args = args.map((arg) => generate(arg, context)).join(", ");
  return `${fun}(${args})`;
}

function genGet({ collection, keys }, context) {
  const coll = generate(collection, context);
  return keys.reduce((coll, key) => {
    const { isDirect } = key;
    key = generate(key, context);
    return isDirect ? `${coll}[${key}]` : `get(${coll}, ${key})`;
  }, coll);
}

function genCoreImport({ names, alias, module }, context) {
  alias = alias ? namify(alias) : context.oneOffName();
  module = `const ${alias} = require("${module}");`;
  names = names.length ?
    `const { ${names.map(namify).join(", ")} } = ${alias};` :
    "";
  return [module, names].filter(str => str !== "").join("\n");
}

function genImport({ names, alias, module }, context) {
  alias = alias ? namify(alias) : context.oneOffName();
  module = `const ${alias} = require("${module}");`;
  names = names.length ?
    `const { ${names.map(namify).join(", ")} } = ${alias};` :
    "";
  return [module, names].filter(str => str !== "").join("\n");
}

function genModuleImports({ imports }, context) {
  return imports
    .map(_import => generate(_import, context))
    .join("\n\n");
}

function genModuleDefinitions({ definitions }, context) {
  return definitions
    .map(definition => generate(definition, context))
    .join("\n\n");
}

function genModuleExport({ export: _export }, context) {
  if (_export) {
    const { type, name, names, location } = _export;
    if (name) {
      return `module.exports = ${namify(name)};`;
    }
    else if (names) {
      return `module.exports = { ${names.map(namify).join(", ")} };`;
    }
  }
}

function genModule(ast, context) {
  const coreImport = genCoreImport(context.core, context);
  const imports = genModuleImports(ast, context);
  const definitions = genModuleDefinitions(ast, context);
  const _export = genModuleExport(ast, context);
  return [coreImport, imports, definitions, _export]
    .filter(x => x !== "")
    .join("\n\n");
}

function initContext({ core }) {
  return new Context(core);
}

function generate(ast, context) {
  switch (ast.type) {
    case "undefined": return genUndefined(ast, context);
    case "null": return genNull(ast, context);
    case "false": return genFalse(ast, context);
    case "true": return genTrue(ast, context);
    case "number": return genNumber(ast, context);
    case "string": return genString(ast, context);
    case "key": return genKey(ast, context);
    case "identifier": return genIdentifier(ast, context);
    case "list": return genList(ast, context);
    case "map":  return genMap(ast, context);
    case "lambda": return genLambda(ast, context);
    case "getter": return genGetter(ast, context);
    /*case "setter": return genSetter(ast, context);*/
    case "constant": return genConstant(ast, context);
    case "function": return genFunction(ast, context);
    case "do": return genDo(ast, context);
    case "case": return genCase(ast, context);
    case "let": return genLet(ast, context);
    case "call": return genCall(ast, context);
    case "get": return genGet(ast, context);
    case "import": return genImport(ast, context);
    case "export": return genExport(ast, context);
    case "module": return genModule(ast, context);
    default: throw new GenerationError(`Internal error: unknown AST type ${ast.type}.`, ast.location);
  }
}

module.exports = function(ast, options) {
  options = options || defaultOptions;
  return generate(ast, initContext(options));
};
