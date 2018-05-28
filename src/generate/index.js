const { generate: emit } = require("astring");

const GenerationError = require("./error");

const defaultOptions = require("../defaultOptions");

const LIST = {
  type: "Identifier",
  name: "list"
};

const HASHMAP = {
  type: "Identifier",
  name: "hashmap"
};

const RECORD = {
  type: "Identifier",
  name: "record"
};

const MONAD = {
  type: "Identifier",
  name: "monad"
};

const GET = {
  type: "Identifier",
  name: "get"
};

const GETP = {
  type: "Identifier",
  name: "getp"
};

const ARGUMENTS = {
  type: "Identifier",
  name: "arguments"
};

const ARG = {
  type: "Identifier",
  name: "$arg"
};

const VIA = {
  type: "Identifier",
  name: "$via"
};

const MAIN = {
  type: "Identifier",
  name: "main"
};

const BAD_ARITY = {
  type: "ThrowStatement",
  argument: {
    type: "NewExpression",
    callee: {
      type: "Identifier",
      name: "TypeError"
    },
    arguments: [
      {
        type: "BinaryExpression",
        operator: "+",
        left: {
          type: "Literal",
          value: "Arity not supported: "
        },
        right: {
          type: "MemberExpression",
          object: ARGUMENTS,
          property: {
            type: "Identifier",
            name: "length"
          },
          computed: false
        }
      }
    ]
  }
};

class Context {
  constructor(options, parent) {
    this.options = options;
    this.oneOffCount = 0;
    this.definitions = [];
    this.parent = parent;
  }

  oneOffName() {
    return {
      type: "Identifier",
      name: `$tmp${this.oneOffCount++}`
    };
  }

  define(definition) {
    this.definitions.push(definition);
  }

  defined() {
    return this.definitions;
  }

  spawn() {
    return new Context(this.options, this);
  }
}

function namify(name) {
  return name
    .replace(
      /^(do|if|in|for|let|new|try|var|case|else|enum|eval|null|undefined|this|true|void|with|await|break|catch|class|const|false|super|throw|while|yield|delete|export|import|public|return|static|switch|typeof|default|extends|finally|package|private|continue|debugger|function|arguments|interface|protected|implements|instanceof)$/g,
      function(match) {
        return `$${match}`;
      })
    .replace(
      /[\+\-\*\/\>\<\=\%\!\|\&\^\~\?\.\']/g,
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
          case "'": return "$quote";
        }
      });
}

function genNameLValue(name, value, context) {
  return [
    {
      type: "VariableDeclaration",
      declarations: [
        {
          type: "VariableDeclarator",
          id: generate(name, context),
          init: value
        }
      ],
      kind: "const"
    }
  ];
}

function genAlias({ name, lvalue }, value, context) {
  name = generate(name, context);
  return [
    {
      type: "VariableDeclaration",
      declarations: [
        {
          type: "VariableDeclarator",
          id: name,
          init: value
        }
      ],
      kind: "const"
    }
  ].concat(genLValue(lvalue, name, context));
}

function genListDestructItem({ key, lvalue }, value, context) {
  value = {
    type: "CallExpression",
    callee: GET,
    arguments: [
      value,
      {
        type: "Literal",
        value: key
      }
    ]
  }
  return genLValue(lvalue, value, context);
}

function genListDestruct({ items }, value, context) {
  if (items.length > 1) {
    // TODO or primitive
    if (value.type === "Identifier" ||
        value.type === "Literal") {
      return items
        .map((item, i) => genListDestructItem({ key: i, lvalue: item }, value, context))
        .reduce((a, b) => a.concat(b));
    }
    else {
      const tmpName = context.oneOffName();
      return [
        {
          type: "VariableDeclaration",
          declarations: [
            {
              type: "VariableDeclarator",
              id: tmpName,
              init: value
            }
          ],
          kind: "const"
        }
      ].concat(items
        .map((item, i) => genListDestructItem({ key: i, lvalue: item }, tmpName, context))
        .reduce((a, b) => a.concat(b)));
    }
  }
  else {
    return genListDestructItem({ key: 0, lvalue: items[0] }, value, context);
  }
}

function genMapDestructItem({ key, lvalue }, value, context) {
  value = {
    type: "CallExpression",
    callee: key.type === "property" ? GETP : GET,
    arguments: [
      value,
      generate(key, context)
    ]
  }
  return genLValue(lvalue, value, context);
}

function genMapDestruct({ items }, value, context) {
  if (items.length > 1) {
    if (value.type === "Identifier" ||
        value.type === "Literal") {
      return items
        .map(item => genMapDestructItem(item, value, context))
        .reduce((a, b) => a.concat(b));
    }
    else {
      const tmpName = context.oneOffName();
      return [
        {
          type: "VariableDeclaration",
          declarations: [
            {
              type: "VariableDeclarator",
              id: tmpName,
              init: value
            }
          ],
          kind: "const"
        }
      ].concat(items
        .map(item => genMapDestructItem(item, tmpName, context))
        .reduce((a, b) => a.concat(b)));
    }
  }
  else {
    return genMapDestructItem(items[0], value, context);
  }
}

function genTupleDestruct(tuple, value, context) {
  return genListDestruct(tuple, value, context);
}

// This expects value to be compiled already
function genLValue(lvalue, value, context) {
  switch(lvalue.type) {
    case "name": return genNameLValue(lvalue, value, context);
    case "alias": return genAlias(lvalue, value, context);
    case "tupleDestruct": return genTupleDestruct(lvalue, value, context);
    case "mapDestruct": return genMapDestruct(lvalue, value, context);
    case "listDestruct": return genListDestruct(lvalue, value, context);
    default: throw new GenerationError(`Internal error: unknown AST type ${lvalue.type}.`, lvalue.location);
  }
}

function genUndefined(_, context) {
  return {
    type: "Identifier",
    name: "undefined"
  };
}

function genNull(_, context) {
  return {
    type: "Literal",
    value: null
  };
}

function genFalse(_, context) {
  return {
    type: "Literal",
    value: false
  };
}

function genTrue(_, context) {
  return {
    type: "Literal",
    value: true
  };
}

function genNumber({ value }, context) {
  return {
    type: "Literal",
    value: parseFloat(value)
  };
}

function genString({ value }, context) {
  return {
    type: "Literal",
    value: value
  };
}

function genKey({ value }, context) {
  return {
    type: "Literal",
    value: value
  };
}

function genName({ name }, context) {
  return {
    type: "Identifier",
    name: namify(name)
  };
}

function genSymbol(symbol, context) {
  return genName(symbol);
}

function genProperty({ name }, context) {
  return {
    type: "Literal",
    value: namify(name)
  };
}

function genTuple({ items }, context) {
  return {
    type: "ArrayExpression",
    elements: items.map(item => generate(item, context))
  };
}

function genList({ items }, context) {
  return {
    type: "CallExpression",
    callee: LIST,
    arguments: items.map(item => generate(item, context))
  };
}

function genMap({ items }, context) {
  return {
    type: "CallExpression",
    callee: HASHMAP,
    arguments: items
      .map(({ key, value }) => ({
        type: "ArrayExpression",
        elements: [generate(key, context), generate(value, context)]
      }))
  };
}

function genConstant({ lvalue, value }, context) {
  return genLValue(lvalue, generate(value, context), context);
}

function pregenFunctionVariant(name, { args, body }, context) {
  const arity = args.length;

  name = name ?
    generate(
      { type: "name", name: `${name.name}$${arity}` },
      context) :
    null;

  // TODO $arg
  const argsList = args.map((arg, i) => ({
    type: "Identifier",
    name: `$arg${i}`
  }));

  const initArgs = args
    .map((arg, i) => genLValue(arg, argsList[i], context))
    .reduce((a, b) => a.concat(b), []);

  args = argsList;

  body = initArgs
    .concat({
      type: "ReturnStatement",
      argument: generate(body, context)
    });

  return {
    name,
    arity,
    args,
    body
  };
}

function genFunction({ name, variants }, context) {
  variants = variants.map(variant =>
    pregenFunctionVariant(name, variant, context));

  const functions = variants
    .map(({ name, args, body }) => ({
      type: "FunctionDeclaration",
      id: name,
      params: args,
      body: {
        type: "BlockStatement",
        body: body
      }
    }));

  const arities = variants.map(({ name, arity, args }) => {
    return {
      type: "SwitchCase",
      test: {
        type: "Literal",
        value: arity
      },
      consequent: [
        {
          type: "ReturnStatement",
          argument: {
            type: "CallExpression",
            callee: name,
            arguments: args.map((arg, i) => ({
              type: "MemberExpression",
              object: ARGUMENTS,
              property: {
                type: "Literal",
                value: i
              },
              computed: true
            }))
          }
        }
      ]
    };
  });

  const badArity = {
    type: "SwitchCase",
    consequent: [BAD_ARITY]
  };

  const body = {
    type: "SwitchStatement",
    discriminant: {
      type: "MemberExpression",
      object: ARGUMENTS,
      property: {
        type: "Identifier",
        name: "length"
      },
      computed: false
    },
    cases: arities.concat(badArity)
  };

  const dispatchFunction = {
    type: "FunctionDeclaration",
    id: generate(name, context),
    params: [],
    body: {
      type: "BlockStatement",
      body: [body]
    }
  };

  return functions.concat(dispatchFunction);
}

function genRecord({ name, args }, context) {
  return {
    type: "VariableDeclaration",
    declarations: [
      {
        type: "VariableDeclarator",
        id: generate(name, context),
        init: {
          type: "CallExpression",
          callee: RECORD,
          arguments: args.map(({ name }) => ({
            type: "Literal",
            value: name
          }))
        }
      }
    ],
    kind: "const"
  };
}

function genDefinition(definition, context) {
  switch(definition.type) {
    case "constant": return genConstant(definition, context);
    case "function": return genFunction(definition, context);
    case "record": return genRecord(definition, context);
    default: throw new GenerationError(`Internal error: unknown AST type ${definition.type}.`, definition.location);
  }
}

function genDefinitions(definitions, context) {
  return definitions
    .map(definition => genDefinition(definition, context))
    .reduce((a, b) => a.concat(b));
}

function genLambda(lambda, context) {
  const { arity, args, body } = pregenFunctionVariant(null, lambda, context);
  const badArity = {
    type: "IfStatement",
    test: {
      type: "BinaryExpression",
      operator: "!==",
      left: {
        type: "MemberExpression",
        object: ARGUMENTS,
        property: {
          type: "Identifier",
          name: "length"
        },
        computed: false
      },
      right: {
        type: "Literal",
        value: arity
      }
    },
    consequent: BAD_ARITY
  };
  return {
    type: "FunctionExpression",
    params: args,
    body: {
      type: "BlockStatement",
      body: [badArity].concat(body)
    }
  };
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
          {
            type: "FunctionExpression",
            params: [VIA],
            body: {
              type: "BlockStatement",
              body: genLValue(via, VIA, context).concat({
                type: "ReturnStatement",
                argument: right
              })
            }
          } :
          {
            type: "FunctionExpression",
            params: [],
            body: {
              type: "BlockStatement",
              body: [
                {
                  type: "ReturnStatement",
                  argument: right
                }
              ]
            }
          };
        return {
          type: "CallExpression",
          callee: MONAD,
          arguments: [value, next]
        };
      }
    }
  }
  return _generate(items, context);
}

function genCase({ branches, otherwise }, context) {
  function _generate(branches, context) {
    if (!branches.length) {
      return generate(otherwise, context);
    }
    const { condition, value } = branches[0];
    const rest = branches.slice(1);
    const _condition = generate(condition, context);
    const ifTrue = generate(value, context);
    const ifFalse = _generate(rest, context);
    return {
      type: "ConditionalExpression",
      test: _condition,
      consequent: ifTrue,
      alternate: ifFalse
    };
  }
  return _generate(branches, context);
}

function genScope({ definitions, body }, context) {
  return {
    type: "CallExpression",
    callee: {
      type: "FunctionExpression",
      params: [],
      body: {
        type: "BlockStatement",
        body: genDefinitions(definitions, context)
          .concat({
            type: "ReturnStatement",
            argument: generate(body, context)
          })
      }
    },
    arguments: []
  };
}

function genCall({ callee, args }, context) {
  return {
    type: "CallExpression",
    callee: generate(callee, context),
    arguments: args.map((arg) => generate(arg, context))
  };
}

function genInvoke({ object, method, args }, context) {
  return {
    type: "CallExpression",
    callee: {
      type: "MemberExpression",
      object: generate(object, context),
      property: generate(method, context),
      computed: true
    },
    arguments: args.map((arg) => generate(arg, context))
  };
}

function genImport({ module, value }, context) {
  if (!module) {
    return {
      type: "EmptyStatement"
    };
  }
  else {
    const require = {
      type: "VariableDeclarator",
      id: generate(module, context),
      init: {
        type: "CallExpression",
        callee: {
          type: "Identifier",
          name: "require"
        },
        arguments: [
          {
            type: "Literal",
            value: module.name
          }
        ]
      }
    };
    let symbols = null;
    if (value.type === "symbols") {
      symbols = value.items
        .map(({ key, name }) => ({
          type: "VariableDeclarator",
          id: generate(name, context),
          init: {
            type: "MemberExpression",
            object: generate(module, context),
            property: generate(key, context),
            computed: false
          }
        }));
    }
    else if (value.type === "symbol") {
      // TODO
    }
    else {
      new GenerationError(`Internal error: unknown AST type ${value.type}.`, value.location);
    }
    return {
      type: "VariableDeclaration",
      declarations: [require].concat(symbols),
      kind: "const"
    };
  }
}

function genModuleImports({ imports }, context) {
  return imports.map(_import => generate(_import, context));
}

function genModuleDefinitions({ definitions }, context) {
  return genDefinitions(definitions, context);
}

function genModuleExport({ export: { value } }, context) {
  if (value.type === "symbols") {
    value = {
      type: "ObjectExpression",
      properties: value.items
        .map(({ key, name }) => ({
          type: "Property",
          key: generate(name, context),
          value: generate(key, context),
          kind: "init"
        }))
    };
  }
  else if (value.type === "symbol") {
    value = generate(value, context);
  }
  else {
    new GenerationError(`Internal error: unknown AST type ${value.type}.`, value.location);
  }
  return {
    type: "AssignmentExpression",
    operator: "=",
    left: {
      type: "MemberExpression",
      object: {
        type: "Identifier",
        name: "module"
      },
      property: {
        type: "Identifier",
        name: "exports"
      },
      computed: false
    },
    right: value
  };
}

/*function genEssentials() {
  return {
    type: "VariableDeclaration",
    declarations: Object.entries(ESSENTIALS)
      .map(([essential, name]) => ({
        type: "VariableDeclarator",
        id: {
          type: "Identifier",
          name: essential
        },
        init: {
          type: "Identifier",
          name: name
        }
      })),
    kind: "const"
  };
}*/

function genApp(module, context) {
  return {
    type: "Program",
    body:
      genModuleImports(module, context)
      .concat(genModuleDefinitions(module, context))
      .concat({
        type: "CallExpression",
        callee: MAIN,
        arguments: []
      })
  };
}

function genLib(module, context) {
  return {
    type: "Program",
    body:
      genModuleImports(module, context)
      .concat(genModuleDefinitions(module, context))
      .concat(genModuleExport(module, context))
  };
}

function genModule(module, context) {
  if (!module.export) {
    return genApp(module, context);
  }
  else {
    return genLib(module, context);
  }
}

function generate(ast, context) {
  switch (ast.type) {
    case "number": return genNumber(ast, context);
    case "string": return genString(ast, context);
    case "key": return genKey(ast, context);
    case "name": return genName(ast, context);
    case "property": return genProperty(ast, context);
    case "symbol": return genSymbol(ast, context);
    case "list": return genList(ast, context);
    case "map":  return genMap(ast, context);
    case "tuple": return genTuple(ast, context);
    case "lambda": return genLambda(ast, context);
    case "monad": return genMonad(ast, context);
    case "case": return genCase(ast, context);
    case "scope": return genScope(ast, context);
    case "call": return genCall(ast, context);
    case "invoke": return genInvoke(ast, context);
    case "import": return genImport(ast, context);
    case "export": return genExport(ast, context);
    case "module": return genModule(ast, context);
    default: throw new GenerationError(`Internal error: unknown AST type ${ast.type}.`, ast.location);
  }
}

module.exports = function(ast, options) {
  options = options || defaultOptions;
  const estree = generate(ast, new Context(options));
  return emit(estree);
};
