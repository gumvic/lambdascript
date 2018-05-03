const GenerationError = require("./error");

class Context {}

function __(str) {
  const indentationLength = 2;
  return str
    .split("\n")
    .map(line => line.padStart(line.length + indentationLength))
    .join("\n");
}

let _oneOffName = 0;
function oneOffName(name) {
  return `$${name}_${_oneOffName++}`;
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
  return `"${value}"`;
}

function genIdentifier({ name }, context) {
  // TODO js reserved words
  return name;
}

function genMap({ items, location }, context) {
  const items = items
    .map(({ key, value }) => `[${generate(key, context)}, ${generate(value, context)}]`)
    .join(", ");
  return `Map([${items}])`;
}

function genList({ items, location }, context) {
  const items = items.map(item => generate(item, context)).join(", ");
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
  const coll = oneOffName("coll");
  if (keys.length === 1) {
    const key = generate(keys[0], context);
    return `(${coll}) => core.data.get(${coll}, ${key})`;
  }
  else {
    keys = keys.map(key => generate(key, context)).join(", ");
    return `(${coll}) => core.data.setIn(${coll}, [${keys}])`;
  }
}

function genSetter({ keys }, context) {
  const coll = oneOffName("coll");
  const value = oneOffName("value");
  if (keys.length === 1) {
    const key = generate(keys[0], context);
    return `(${coll}, ${value}) => core.data.set(${coll}, ${key}, ${value})`;
  }
  else {
    keys = keys.map(key => generate(key, context)).join(", ");
    return `(${coll}, ${value}) => core.data.setIn(${coll}, [${keys}], ${value})`;
  }
}

function genConstant({ name, value }, context) {
  return `const ${name} = ${generate(value, context)};`;
}

function genFunction({ name, variants }, context) {
  variants = variants
    .map(({ args, body }) => {
      const arity = args.length;
      args = `const [${args.join(", ")}] = arguments;`;
      body = `return ${generate(body, context)};`;
      return [
        `if (arguments.length === ${arity}) {`,
        __(args),
        __(body),
        "}"
      ].join("\n");
    })
    .join("\nelse ");
  const defaultVariant = [
    "else {",
    __("throw new TypeError(\"Arity not supported: \" + arguments.length.toString());"),
    "}"
  ].join("\n");
  return [
    `function ${name || ""}() {`,
    __(variants),
    __(defaultVariant),
    "}"
  ].join("\n");
}

function genJoin({ left, via, right, location }, context) {
  left = generate(left, context);
  right = generate({
    type: "function",
    args: [via],
    body: right,
    location: right.location
  }, context);
  return [
    "Join(",
    __(`${left},`),
    __(`${right})`)
  ].join("\n");
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
  if (ast.fun.type === "operator") {
    return genOperatorCall(ast, context);
  }
  else if (ast.fun.type === "get") {
    return genMethodCall(ast, context);
  }
  else {
    return genFunctionCall(ast, context);
  }
}

function genOperatorCall({ fun, args, location }, context) {
  const operator = fun.name;
  if (args.length === 1) {
    const left = generate(args[0], context);
    return `${operator}${left}`;
  }
  else if (args.length === 2) {
    const left = generate(args[0], context);
    const right = generate(args[1], context);
    return `${left} ${operator} ${right}`;
  }
  else throw new GenerationError(`Internal error: wrong number of arguments: ${args.length}.`, location);
}

function genMethodCall({ fun: { collection, keys }, args }, context) {
  args = args.map((arg) => generate(arg, context)).join(", ");
  collection = generate(collection, context);
  if (keys.length === 1) {
    const key = generate(keys[0], context);
    return `core.data.invoke(${collection}, ${key}, [${args}])`;
  }
  else {
    keys = keys.map(key => generate(key, context)).join(", ");
    return `core.data.invokeIn(${collection}, [${keys}], [${args}])`;
  }
}

function genFunctionCall({ fun, args }, context) {
  // TODO wrap in braces values that js won't call
  fun = generate(fun, context);
  args = args.map((arg) => generate(arg, context)).join(", ");
  return `${fun}(${args})`;
}

function genOperator({ location }, context) {
  throw new GenerationError(`Internal error: not implemented.`, location);
}

function genGet({ collection, keys }, context) {
  collection = generate(collection, context);
  if (keys.length === 1) {
    const key = generate(keys[0], context);
    return `core.data.get(${collection}, ${key})`;
  }
  else {
    keys = keys.map(key => generate(key, context)).join(", ");
    return `core.data.getIn(${collection}, [${keys}])`;
  }
}

function genImport({ names, alias, module }, context) {
  alias = alias || oneOffName(module);
  module = `const ${alias} = require("${module}");`;
  names = names.length ?
    `const { ${names.join(", ")} } = ${alias};` :
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
      return `module.exports = ${name};`;
    }
    else if (names) {
      return `module.exports = { ${names.join(", ")} };`;
    }
  }
}

function genModule(ast, context) {
  const imports = genModuleImports(ast);
  const definitions = genModuleDefinitions(ast);
  const _export = genModuleExport(ast);
  return [imports, definitions, _export].filter(x => x !== "").join("\n\n");
}

function generate(ast, context) {
  context = context || new Context();
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
    case "setter": return genSetter(ast, context);
    case "constant": return genConstant(ast, context);
    case "function": return genFunction(ast, context);
    case "join": return genJoin(ast, context);
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

module.exports = generate;
