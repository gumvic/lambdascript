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
      /^(do|if|in|for|let|new|try|var|case|else|enum|eval|null|this|true|void|with|await|break|catch|class|const|false|super|throw|while|yield|delete|export|import|public|return|static|switch|typeof|default|extends|finally|package|private|continue|debugger|function|arguments|interface|protected|implements|instanceof)$/g,
      function(match) {
        return `$${match}`;
      })
    .replace(
      /[\+\-\*\/\>\<\=\%\!\|\&\^\~\?\.]/g,
      function(match) {
        switch(match) {
          case "+": return "$plus";
          case "-": return "$dash";
          case "*": return "$star";
          case "/": return "$slash";
          case ">": return "$right";
          case "<": return "$left";
          case "=": return "$equals";
          case "%": return "$percent";
          case "!": return "$bang";
          case "|": return "$pipe";
          case "&": return "$and";
          case "^": return "$caret";
          case "~": return "$tilda";
          case "?": return "$question";
          case ".": return "$dot";
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

function genMapDestruct({ items }, value, context) {
  function genItem({ key, lvalue }, value, context) {
    value = {
      type: "call",
      callee: {
        type: "name",
        name: "get"
      },
      args: [value, key]
    };
    return genLValue(lvalue, value, context);
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

function genLValue(ast, value, context) {
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
      genLValue(ast.lvalue, ast.name, context));
  }
  else if (ast.type === "mapDestruct") {
    return genMapDestruct(ast, value, context);
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

function genConstant({ lvalue, value }, context) {
  return genLValue(lvalue, value, context);
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
    args.map((arg, i) => genLValue(arg, { type: "js", code: `arguments[${i}]` }, context)),
    `return ${generate(body, context)};`);
  return lines(
    `if (arguments.length === ${args.length}) {`,
    __(variant),
    "}");
}

function genLambda({ args, body }, context) {
  body = genVariant({ args, body }, context);
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
            "($val) => {",
            __(lines(
              genLValue(via, { type: "name", name: "$val" }, context),
              `return ${right};`)),
            "}"):
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
  const { callee, args } = ast;
  if (callee.type === "name" &&
      isBuiltInOperator(callee.name, args.length)) {
    return genOperatorCall(ast, context);
  }
  else {
    return genFunctionCall(ast, context);
  }
}

function genOperatorCall({ callee: { name }, args }, context) {
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

function genFunctionCall({ callee, args }, context) {
  // TODO wrap in braces values that js won't call
  callee = generate(callee, context);
  args = args.map((arg) => generate(arg, context)).join(", ");
  return `${callee}(${args})`;
}

function genInvoke({ object, method, args }, context) {
  object = generate(object, context);
  method = namify(method);
  args = args.map((arg) => generate(arg, context)).join(", ");
  return `${object}.${method}(${args})`;
}

function genImport({ module, value }, context) {
  const alias = namify(module);
  if (value.type === "names") {
    value = value.items
      .map(({ key, name }) => ({ key: namify(key), name: namify(name) }))
      .map(({ key, name }) => `const ${name} = ${alias}.${key};`);
  }
  else {
    value = namify(value);
  }
  return lines(
    `const ${alias} = require("${module.name}");`,
    value);
}

function genAutoImport({ module, value }, context) {
  module = {
    type: "name",
    name: module
  };
  if (typeof value === "string") {
    value = {
      type: "name",
      name: value
    };
  }
  else {
    const items = Object.keys(value)
      .map(k => ({
        key: {
          type: "name",
          name: k
        },
        name: {
          type: "name",
          name: value[k]
        }
      }));
    value = {
      type: "names",
      items: items
    };
  }
  return generate({
    type: "import",
    module: module,
    value: value
  });
}

function genAutoImports(imports, context) {
  return lines(imports.map(_import => genAutoImport(_import, context)));
}

function genModuleImports({ imports }, context) {
  return lines(imports.map(_import => generate(_import, context)));
}

function genModuleDefinitions({ definitions }, context) {
  return lines(definitions.map(definition => genDefinition(definition, context)));
}

function genExport({ value }, context) {
  if (value.type === "names") {
    const items = value.items
      .map(({ key, name }) => ({ key: namify(key), name: namify(name) }))
      .map(({ key, name }) => `${key}: ${name}`)
      .join(",\n");
    value = lines("{",
    __(items),
    "}");
  }
  else {
    value = generate(value);
  }
  return `module.exports = ${value};`
}

function genModuleExport({ export: _export }, context) {
  return generate(_export, context);
}

function genModule(ast, context) {
  return lines(
    genAutoImports(context.autoImports, context),
    genModuleImports(ast, context),
    genModuleDefinitions(ast, context),
    genModuleExport(ast, context));
}

function genJS({ code }, context) {
  return code;
}

function initContext({ autoImports }) {
  return new Context(autoImports || []);
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
