const GenerationError = require("./error");

class Context {}

function indent(str, indentation) {
  indentation = indentation || 1;
  const indentationLength = 2;
  return str
    .split("\n")
    .map(line => line.padStart(line.length + (indentation * indentationLength)))
    .join("\n");
}

let _oneOffIdentifier = 0;
function oneOffIdentifier() {
  return `$$__${_oneOffIdentifier++}`;
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

function genIdentifier({ name }, context) {
  return name;
}

function genMap({ items, location }, context) {
  const items = items
    .map(({ key, value }) => `[${generate(key, context)}, ${generate(value, context)}]`)
    .join(", ");
  return `Map(${items})`;
}

function genVector({ items, location }, context) {
  const items = items.map(item => generate(item, context)).join(", ");
  return `Vector(${items})`;
}

function genLambda({ args, body }, context) {
  args = args.join(", ");
  body = generate(body, context);
  return `(${args}) => ${body}`;
}

function genJoin({ left, via, right, location }, context) {
  left = generate(left, context);
  right = generate({
    type: "lambda",
    args: [via],
    body: right,
    location: right.location
  }, context);
  return [
    "Join(",
    indent(`${left},`),
    indent(`${right})`)
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
      indent(`${ifTrue} :`),
      indent(`${ifFalse})`)
    ].join("\n");
  }
  return f(branches, context);
}

function genDefinition({ name, value }, context) {
  return `const ${name} = ${generate(value, context)};`;
}

function genLet({ definitions, body }, context) {
  definitions = definitions
    .map(definition => genDefinition(definition, context))
    .join("\n");
  body = generate(body, context);
  return [
    "((() => {",
    indent(definitions),
    indent(`return ${body};`),
    "})())"
  ].join("\n");
}

function genCall(ast, context) {
  if (ast.fun.type === "operator") {
    return genOperatorCall(ast, context);
  }
  else {
    return genFunctionCall(ast, context);
  }
}

function genFunctionCall({ fun, args }, context) {
  // TODO wrap in braces values that js won't call
  fun = generate(fun, context);
  args = args
    .map((arg) => generate(arg, context))
    .join(", ");
  return `${fun}(${args})`;
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
  else throw new GenerationError(`Internal compiler error: wrong number of arguments: ${args.length}.`, location);
}

function genOperator({ location }, context) {
  throw new GenerationError(`Internal compiler error: not implemented.`, location);
}

function genAccess({ object, property }, context) {
  object = generate(object, context);
  return `${object}.${property}`;
}

function genImport({ globals, alias, module }, context) {
  alias = alias || oneOffIdentifier();
  module = `const ${alias} = require("${module}");`;
  globals = globals
    .map(global => `const ${global} = ${alias}.${global};`)
    .join("\n");
  return [module, globals].join("\n");
}

function genExport(_export, context) {
  if(_export) {
    return `module.exports = ${generate(_export, context)};`;
  }
  else {
    return "";
  }
}

function genModule(ast, context) {
  const imports = ast.imports
    .map(_import => genImport(_import, context))
    .join("\n\n");
  const definitions = ast.definitions
    .map(definition => genDefinition(definition, context))
    .join("\n\n");
  const _export = genExport(ast.export, context);
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
    case "identifier": return genIdentifier(ast, context);
    case "map":  return genMap(ast, context);
    case "vector": return genVector(ast, context);
    case "lambda": return genLambda(ast, context);
    case "join": return genJoin(ast, context);
    case "case": return genCase(ast, context);
    case "let": return genLet(ast, context);
    case "call": return genCall(ast, context);
    case "access": return genAccess(ast, context);
    case "module": return genModule(ast, context);
    default: throw new GenerationError(`Internal compiler error: unknown AST type ${ast.type}.`, ast.location);
  }
}

module.exports = generate;
