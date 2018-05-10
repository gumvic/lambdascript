const GenerationError = require("./error");

const defaultOptions = require("../defaultOptions");

class Context {
  constructor(autoImports) {
    this.autoImports = autoImports;
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
  // TODO this, arguments
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

function decomposePaths(path, ast) {
  if (ast.type === "name") {
    return [
      {
        path: path,
        name: namify(ast.name)
      }
    ];
  }
  else if (ast.type === "demap") {
    return ast.items
      .map(({ key, name }) => decomposePaths(path.concat([key]), name))
      .reduce((a, b) => a.concat(b));
  }
}

function decompose(ast, value, context) {
  function access({ name, path }, value) {
    path = path.map(key => generate(key, context));
    if (path.length === 1) {
      return `const ${name} = get(${value}, ${path[0]});`;
    }
    else {
      return `const ${name} = getIn(${value}, [${path.join(", ")}]);`;
    }
  }
  if (ast.type === "name") {
    return `const ${namify(ast.name)} = ${value};`;
  }
  else {
    const paths = decomposePaths([], ast);
    if (paths.length === 1) {
      return access(paths[0], value);
    }
    else {
      return [
        `$tmp = ${value};`,
        paths.map(path => access(path, "$tmp")).join("\n")
      ].join("\n");
    }
  }
}

function decomposeDirectly(ast, value, context) {
  function access({ name, path }, value) {
    path = path
      .map(key => generate(key, context))
      .map(key => `[${key}]`)
      .join("");
    return `const ${name} = ${value}${path};`;
  }
  if (ast.type === "name") {
    return `const ${namify(ast.name)} = ${value};`;
  }
  else {
    const paths = decomposePaths([], ast);
    if (paths.length === 1) {
      return access(paths[0], value);
    }
    else {
      return [
        `$tmp = ${value};`,
        paths.map(path => access(path, "$tmp")).join("\n")
      ].join("\n");
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

function genName({ name }, context) {
  return namify(name);
}

function genList({ items, location }, context) {
  items = items.map(item => generate(item, context)).join(", ");
  return `ImList([${items}])`;
}

function genMap({ items, location }, context) {
  items = items
    .map(({ key, value }) => `[${generate(key, context)}, ${generate(value, context)}]`)
    .join(", ");
  return `ImMap([${items}])`;
}

function genLambda(ast, context) {
  return genFunction({
    type: "funcion",
    variants: [ast],
    skipChecks: ast.skipChecks,
    location: ast.location
  }, context);
}

function genGetter({ keys }, context) {
  const coll = "$coll";
  if (keys.length === 1) {
    const key = generate(keys[0], context);
    return `(${coll}) => get(${coll}, ${key})`;
  }
  else {
    keys = keys.map(key => generate(key, context)).join(", ");
    return `(${coll}) => getIn(${coll}, [${keys}])`;
  }
}

function genConstant({ name, value }, context) {
  return decompose(name, generate(value, context), context);
}

function genFunctionVariant({ args, body }, context, { skipChecks }) {
  const arity = args.length;
  args = args
    .map((arg, i) => decompose(arg, `arguments[${i}]`, context))
    .join("\n");
  const variant = arity ?
    [
      args,
      `return ${generate(body, context)};`
    ].join("\n") :
    `return ${generate(body, context)};`;
  if (skipChecks) {
    return variant;
  }
  else {
    return [
      `if (arguments.length === ${arity}) {`,
      __(variant),
      "}"
    ].join("\n");
  }
}

function genFunction({ name, variants, skipChecks }, context) {
  if (variants.length !== 1) {
    skipChecks = false;
  }
  const body = variants
    .map(variant => genFunctionVariant(variant, context, { skipChecks }))
    .join("\nelse ");
  return [
    `function ${name ? namify(name) : ""}() {`,
    __(body),
    __("throw new TypeError(\"Arity not supported: \" + arguments.length.toString());"),
    "}"
  ].join("\n");
}

function genMonad({ items }, context) {
  function _generate(items) {
    if (!items.length) {
      return null;
    }
    else {
      const left = items[0];
      const right = _generate(items.slice(1));
      if (!right) {
        return left.value;
      }
      else {
        return {
          type: "call",
          fun: {
            type: "name",
            name: "monad"
          },
          args: [
            left.value,
            {
              type: "lambda",
              args: left.via ? [left.via] : [],
              body: right,
              skipChecks: true
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
      `${_condition} ?`,
      __(`${ifTrue} :`),
      __(`${ifFalse}`)
    ].join("\n");
  }
  return f(branches, context);
}

function genScope({ definitions, body }, context) {
  definitions = definitions
    .map(definition => generate(definition, context))
    .join("\n");
  body = generate(body, context);
  return [
    "(function() {",
    __(definitions),
    __(`return ${body};`),
    "}())"
  ].join("\n");
}

function genCall(ast, context) {
  const { fun, args } = ast;
  if (fun.type === "name" &&
      isBuiltInOperator(fun.name, args.length)) {
    return genOperatorCall(ast, context);
  }
  else if (fun.type === "get") {
    return genMethodCall(ast, context);
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

function genMethodCall({ fun: { collection, keys }, args }, context) {
  const coll = generate(collection, context);
  args = args.map(arg => generate(arg, context)).join(", ");
  if (keys.length === 1) {
    const key = generate(keys[0], context);
    return `invoke(${coll}, ${key}, [${args}])`;
  }
  else {
    keys = keys.map(key => generate(key, context)).join(", ");
    return `invokeIn(${coll}, [${keys}], [${args}])`;
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
  if (keys.length === 1) {
    const key = generate(keys[0], context);
    return `get(${coll}, ${key})`;
  }
  else {
    keys = keys.map(key => generate(key, context)).join(", ");
    return `getIn(${coll}, [${keys}])`;
  }
}

function genImport({ module, name }, context) {
  return decomposeDirectly(name, `require("${module}")`, context);
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
    const value = generate(_export.value, context);
    return `module.exports = toJS(${value});`
  }
}

function genModule(ast, context) {
  ast.imports = context.autoImports.concat(ast.imports);
  const imports = genModuleImports(ast, context);
  const definitions = genModuleDefinitions(ast, context);
  const _export = genModuleExport(ast, context);
  return [
    "let $tmp = null;",
    imports,
    definitions,
    _export
  ].filter(x => x !== "").join("\n\n");
}

function initContext({ autoImports }) {
  return new Context(autoImports);
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
    case "name": return genName(ast, context);
    case "list": return genList(ast, context);
    case "map":  return genMap(ast, context);
    case "lambda": return genLambda(ast, context);
    case "getter": return genGetter(ast, context);
    case "constant": return genConstant(ast, context);
    case "function": return genFunction(ast, context);
    case "monad": return genMonad(ast, context);
    case "case": return genCase(ast, context);
    case "scope": return genScope(ast, context);
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
