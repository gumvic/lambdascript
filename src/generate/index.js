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
    .replace(
      /[\+\-\*\/\>\<\=\%\!\|\&\^\~\?\.]/g,
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
          case ".": return "_dot_";
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

/*function decomposePaths(path, ast) {
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
}*/

/*function genDemap(ast, value, context) {
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
}*/

function genDemap({ items }, value, context) {
  return items.map(({ key, name }) => {
    key = generate(key, context);
    return genDecomp(name, `get(${value}, ${key})`, context);
  }).join("\n");
}

function genDecomp(ast, value, context) {
  if (ast.type === "name") {
    return `const ${namify(ast.name)} = ${value};`;
  }
  else if (ast.type === "alias") {
    const name = namify(ast.name.name);
    return [
      `const ${name} = ${value};`,
      genDecomp(ast.value, name, context)
    ].join("\n");
  }
  else if (ast.type === "demap") {
    return genDemap(ast, value, context);
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

function genConstant({ name, value }, context) {
  return genDecomp(name, generate(value, context), context);
}

function genFunctionVariant({ args, body }, context, { skipChecks }) {
  const arity = args.length;
  args = args
    .map((arg, i) => genDecomp(arg, `arguments[${i}]`, context))
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
    `function ${name ? namify(name.name) : ""}() {`,
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
              type: "function",
              variants: [
                {
                  args: left.via ? [left.via] : [],
                  body: right
                }
              ],
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

function genImport({ module, names }, context) {
  const alias = namify(module.name);
  names = names
    .map(({ name }) => namify(name))
    .map(name => `const ${name} = ${alias}.${name};`)
    .join("\n");
  return [`const ${alias} = require("${module.name}");`].concat(names).join("\n");
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

function genModuleExport({ export: { names } }, context) {
  if (names.length === 1) {
    return `module.exports = ${namify(names[0].name)};`;
  }
  else {
    names = names
      .map(({ name }) => namify(name))
      .map(name => `"${name}": ${name}`)
      .join(",\n");
    return [
      '{',
      __(names),
      '}'
    ].join("\n");
  }
}

function genModule(ast, context) {
  ast.imports = context.autoImports.concat(ast.imports);
  return [
    "let $tmp = null;",
    genModuleImports(ast, context),
    genModuleDefinitions(ast, context),
    genModuleExport(ast, context)
  ].join("\n\n");
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
    case "constant": return genConstant(ast, context);
    case "function": return genFunction(ast, context);
    case "monad": return genMonad(ast, context);
    case "case": return genCase(ast, context);
    case "scope": return genScope(ast, context);
    case "call": return genCall(ast, context);
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
