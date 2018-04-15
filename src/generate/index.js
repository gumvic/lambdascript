const Error = require("./error");

class GenerationError {
  constructor(message, location) {
    this.message = message;
    this.location = location || {
      start: {},
      end: {}
    };
  }
}

function genUndefined(ast) {
  return "undefined";
}

function genNull(ast) {
  return "null";
}

function genFalse(ast) {
  return "false";
}

function genTrue(ast) {
  return "true";
}

function genNumber({ value }) {
  return value.toString();
}

function genString({ value }) {
  return `"${value}"`;
}

function genIdentifier({ name }) {
  return name;
}

function genMap(ast) {
  // TODO
}

function genVector(ast) {
  //const items = ast.items.map(generate).join(",");
  //return "[" + items + "]";
  // TODO
}

function genLambda({ args, body }) {
  args = args.join(",");
  body = generate(body);
  return `(${args})=>${body}`;
}

function genJoin({ left, via, right, location }) {
  return generate({
    type: "call",
    fun: {
      type: "identifier",
      name: "join",
      location: location
    },
    args: [
      left,
      {
        type: "lambda",
        args: [via],
        body: right,
        location: right.location
      }
    ]
  });
}

function genCase({ branches, otherwise }) {
  function f(branches) {
    if (!branches.length) {
      return null;
    }
    const { condition, value } = branches[0];
    const rest = branches.slice(1);
    const _condition = generate(condition);
    const ifTrue = generate(value);
    const ifFalse = generate(f(rest) || otherwise);
    return `(${_condition} ? ${ifTrue} : ${ifFalse})`;
  }
  return f(branches);
}

function genDefinition({ name, value }) {
  return `const ${name}=${generate(value)};`;
}

function genLet({ definitions, body }) {
  definitions = definitions
    .map(genDefinition)
    .join("");
  body = generate(body);
  return `((()=>{${definitions}return ${body};})())`;
}

function genCall(ast) {
  if (ast.fun.type === "operator") {
    return genOperatorCall(ast);
  }
  else {
    return genFunctionCall(ast);
  }
}

function genFunctionCall({ fun, args }) {
  // TODO wrap in braces values that js won't call
  fun = generate(fun);
  args = args
    .map((arg) => generate(arg))
    .join(",");
  return `${fun}(${args})`;
}

function genOperatorCall({ fun, args, location }) {
  const operator = fun.name;
  if (args.length === 1) {
    const left = generate(args[0]);
    return `${operator}${left}`;
  }
  else if (args.length === 2) {
    const left = generate(args[0]);
    const right = generate(args[1]);
    return `${left}${operator}${right}`;
  }
  else throw new GenerationError(`Internal compiler error: wrong number of arguments: ${args.length}.`, location);
}

function genOperator({ location }) {
  throw new GenerationError(`Internal compiler error: not implemented.`, location);
}

function genAccess({ object, property }) {
  object = generate(object);
  return `${object}.${property}`;
}

function genImport({ globals, alias, module }) {
  globals = globals
    .map((name) => `const ${name}=${alias}.${name};`)
    .join("");
  return `const ${alias}=require("${module}");${globals}`;
}

const defaultImports = [
  {
    type: "import",
    alias: "core",
    module: "muscript-core",
    globals: ["join"]
  }
];

function genExport(_export) {
  if(_export) {
    return `module.exports=${generate(_export)};`;
  }
  else {
    return "";
  }
}

function genModule(ast) {
  const imports = defaultImports.concat(ast.imports)
    .map(genImport)
    .join("");
  const definitions = ast.definitions
    .map(genDefinition)
    .join("");
  const _export = genExport(ast.export);
  return `${imports}${definitions}${_export}`;
}

function generate(ast) {
  switch (ast.type) {
    case "undefined": return genUndefined(ast);
    case "null": return genNull(ast);
    case "false": return genFalse(ast);
    case "true": return genTrue(ast);
    case "number": return genNumber(ast);
    case "string": return genString(ast);
    case "identifier": return genIdentifier(ast);
    case "map":  return genMap(ast);
    case "vector": return genVector(ast);
    case "lambda": return genLambda(ast);
    case "join": return genJoin(ast);
    case "case": return genCase(ast);
    case "let": return genLet(ast);
    case "call": return genCall(ast);
    case "access": return genAccess(ast);
    case "module": return genModule(ast);
    default: throw new GenerationError(`Internal compiler error: unknown AST type ${ast.type}.`, ast.location);
  }
}

module.exports = generate;
