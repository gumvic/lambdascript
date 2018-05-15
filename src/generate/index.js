const GenerationError = require("./error");

const defaultOptions = require("../defaultOptions");

class Context {
  constructor(autoImports) {
    this.autoImports = autoImports;
    this.oneOffCount = 0;
  }

  oneOffName() {
    return {
      type: "name",
      name: `$${this.oneOffCount++}`
    };
  }
}

function lines() {
  return Array.prototype.map.call(arguments, line =>
    line instanceof Array ?
      lines.apply(null, line):
      line).filter(s => !!s).join("\n");
}

function __(str) {
  const indentationLength = 2;
  return str
    .split("\n")
    .map(line => line.padStart(line.length + indentationLength))
    .join("\n");
}

function namify({ name }) {
  return name
    .replace(
      /^do|if|in|for|let|new|try|var|case|else|enum|eval|null|this|true|void|with|await|break|catch|class|const|false|super|throw|while|yield|delete|export|import|public|return|static|switch|typeof|default|extends|finally|package|private|continue|debugger|function|arguments|interface|protected|implements|instanceof$/g,
      function(match) {
        return `_${match}_`;
      })
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

function genDemap({ items }, value, context) {
  function genItem({ key, name }, value, context) {
    value = {
      type: "call",
      fun: {
        type: "name",
        name: "get"
      },
      args: [value, key]
    };
    return genDecomp(name, value, context);
  }
  if (items.length > 1) {
    const tmpName = context.oneOffName();
    value = generate(value, context);
    return lines(
      `const ${namify(tmpName)} = ${value};`,
      items.map(item => genItem(item, tmpName, context)));
  }
  else {
    return genItem(items[0], value, context);
  }
}

function genDecomp(ast, value, context) {
  if (ast.type === "name") {
    const name = namify(ast);
    value = generate(value, context);
    return `const ${name} = ${value};`;
  }
  else if (ast.type === "alias") {
    const name = namify(ast.name);
    value = generate(value, context);
    return lines(
      `const ${name} = ${value};`,
      genDecomp(ast.value, ast.name, context));
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

function genKey(ast, context) {
  return `"${namify(ast)}"`;
}

function genName(ast, context) {
  return namify(ast);
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
  return genDecomp(name, value, context);
}

function genFunction({ name, variants }, context) {
  const body = variants
    .map(variant => genVariant(variant, context))
    .join("\nelse ");
  return lines(
    `function ${namify(name)}() {`,
    __(body),
    __("throw new TypeError(\"Arity not supported: \" + arguments.length.toString());"),
    "}");
}

function genDefinition(ast, context) {
  const { type } = ast;
  if (type === "constant") {
    return genConstant(ast, context);
  }
  else if (type === "function") {
    return genFunction(ast, context);
  }
}

function genVariant({ args, body }, context) {
  const variant = lines(
    args.map((arg, i) => genDecomp(arg, { type: "js", code: `arguments[${i}]` }, context)),
    `return ${generate(body, context)};`);
  return lines(
    `if (arguments.length === ${args.length}) {`,
    __(variant),
    "}");
}

function genLambda({ variants }, context) {
  const body = variants
    .map(variant => genVariant(variant, context))
    .join("\nelse ");
  return lines(
    `() => {`,
    __(body),
    __("throw new TypeError(\"Arity not supported: \" + arguments.length.toString());"),
    "}");
}

function genMonad({ items }, context) {
  function _generate(items, context) {
    if (!items.length) {
      return null;
    }
    else {
      const left = items[0];
      const via = left.via;
      const right = _generate(items.slice(1), context);
      const value = generate(left.value, context);
      if (!right) {
        return value;
      }
      else {
        const next = via ?
          lines(
            "($val) =>",
            __(lines(
              genDecomp(via, { type: "name", name: "$val" }, context),
              right))):
          lines(
            "() =>",
            __(right));
        return `monad(${value}, ${next})`;
      }
    }
  }
  return _generate(items, context);
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
    return lines(
      `${_condition} ?`,
      __(`${ifTrue} :`),
      __(`${ifFalse}`));
  }
  return f(branches, context);
}

function genScope({ definitions, body }, context) {
  definitions = lines(definitions.map(definition => genDefinition(definition, context)));
  body = generate(body, context);
  return lines(
    "(() => {",
    __(definitions),
    __(`return ${body};`),
    "}())");
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

function genInvoke({ object, method, args }, context) {
  object = generate(object, context);
  method = namify(method);
  args = args.map((arg) => generate(arg, context)).join(", ");
  return `${object}.${method}(${args})`;
}

function genImport({ module, names }, context) {
  const alias = namify(module);
  names = names
    .map(namify)
    .map(name => `const ${name} = ${alias}.${name};`);
  return lines(
    `const ${alias} = require("${module.name}");`,
    names);
}

function genModuleImports({ imports }, context) {
  return lines(imports.map(_import => generate(_import, context)));
}

function genModuleDefinitions({ definitions }, context) {
  return lines(definitions.map(definition => genDefinition(definition, context)));
}

function genModuleExport({ export: { names } }, context) {
  if (names.length === 1) {
    return `module.exports = ${namify(names[0])};`;
  }
  else {
    names = names
      .map(namify)
      .map(name => `"${name}": ${name}`)
      .join(",\n");
    return lines(
      'module.exports = {',
      __(names),
      '}');
  }
}

function genModule(ast, context) {
  ast.imports = context.autoImports.concat(ast.imports);
  return lines(
    genModuleImports(ast, context),
    genModuleDefinitions(ast, context),
    genModuleExport(ast, context));
}

function genJS({ code }, context) {
  return code;
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
    case "monad": return genMonad(ast, context);
    case "case": return genCase(ast, context);
    case "scope": return genScope(ast, context);
    case "call": return genCall(ast, context);
    case "invoke": return genInvoke(ast, context);
    case "import": return genImport(ast, context);
    case "export": return genExport(ast, context);
    case "module": return genModule(ast, context);
    case "js": return genJS(ast, context);
    default: throw new GenerationError(`Internal error: unknown AST type ${ast.type}.`, ast.location);
  }
}

module.exports = function(ast, options) {
  options = options || defaultOptions;
  return generate(ast, initContext(options));
};
