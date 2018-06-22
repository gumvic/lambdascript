const { generate: emit } = require("astring");

const GenerationError = require("./error");

const defaultOptions = require("../defaultOptions");

const LIST = {
  type: "Identifier",
  name: "List"
};

const MAP = {
  type: "Identifier",
  name: "Map"
};

const RECORD = {
  type: "Identifier",
  name: "record"
};

const MONAD = {
  type: "Identifier",
  name: "Monad"
};

const GET = {
  type: "Identifier",
  name: "get"
};

const GETP = {
  type: "Identifier",
  name: "getp"
};

const MERGE = {
  type: "Identifier",
  name: "merge"
};

const REMOVE = {
  type: "Identifier",
  name: "remove"
};

const ASSERT = {
  type: "Identifier",
  name: "assert"
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

const ARITY = {
  type: "MemberExpression",
  object: ARGUMENTS,
  property: {
    type: "Identifier",
    name: "length"
  },
  computed: false
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
        right: ARITY
      }
    ]
  }
};

class Context {
  constructor(options, parent) {
    this.options = options;
    this.oneOffCount = 0;
    this.specs = [];
    this.parent = parent;
  }

  oneOffName() {
    return {
      type: "Identifier",
      name: `$tmp${this.oneOffCount++}`
    };
  }

  defineSpec(spec) {
    this.specs.push(spec);
  }

  getSpec(name) {
    const spec = this.specs.filter(({ name: specName }) => specName.name === name.name)[0];
    return spec && spec.spec;
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

function genSkipLValue(name, value, context) {
  return [];
}

function genNameLValue(name, value, context) {
  const spec = context.getSpec(name);
  value = spec ?
    genSpecAssert(spec, value, context) :
    generate(value, context);
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
  return genNameLValue(name, value, context)
    .concat(genLValue(lvalue, name, context));
}

function genCollDestructItem({ key, lvalue }, value, context) {
  value = {
    type: "CallExpression",
    callee: key.type === "property" ? GETP : GET,
    arguments: [generate(value, context), generate(key, context)]
  }
  return genLValue(lvalue, value, context);
}

function genCollDestructItems(items, value, context) {
  return items
    .map(item => genCollDestructItem(item, value, context))
    .reduce((a, b) => a.concat(b), []);
}

function genCollDestructWithRest({ items, rest }, value, context) {
  if (rest) {
    value = items.reduce((value, { key }) => ({
      type: "CallExpression",
      callee: REMOVE,
      arguments: [value, generate(key, context)]
    }), generate(value, context));
    return [
      {
        type: "VariableDeclaration",
        declarations: [
          {
            type: "VariableDeclarator",
            id: generate(rest, context),
            init: value
          }
        ],
        kind: "const"
      }
    ];
  }
  else {
    return [];
  }
}

function genCollDestruct({ items, rest }, value, context) {
  value = generate(value, context);
  if (value.type !== "Identifier" &&
      value.type !== "Literal") {
    return genCollDestructItems(items, value, context)
      .concat(genCollDestructWithRest({ items, rest }, value, context));
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
            init: generate(value, context)
          }
        ],
        kind: "const"
      }
    ].concat(genCollDestructItems(items, tmpName, context))
     .concat(genCollDestructWithRest({ items, rest }, value, context));
  }
}

function genListDestruct({ items, rest }, value, context) {
  items = items.map((lvalue, i) => ({
    key: {
      type: "literal",
      value: i
    },
    lvalue: lvalue
  }));
  return genCollDestruct({ items, rest }, value, context);
}

function genMapDestruct(map, value, context) {
  return genCollDestruct(map, value, context);
}

function genLValue(lvalue, value, context) {
  switch(lvalue.type) {
    case "skip": return genSkipLValue(lvalue, value, context);
    case "name": return genNameLValue(lvalue, value, context);
    case "alias": return genAlias(lvalue, value, context);
    case "mapDestruct": return genMapDestruct(lvalue, value, context);
    case "listDestruct": return genListDestruct(lvalue, value, context);
    default: throw new GenerationError(`Internal error: unknown AST type ${lvalue.type}.`, lvalue.location);
  }
}

function genSkip(_, context) {
  return {
    type: "Identifier",
    name: "undefined"
  };
}

function genLiteral({ value }, context) {
  return value === undefined ?
    {
      type: "Identifier",
      name: "undefined"
    } :
    {
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

function genWithRest(value, rest, context) {
  return rest ?
    {
      type: "CallExpression",
      callee: MERGE,
      arguments: [
        value,
        generate(rest, context)
      ]
    } :
    value;
}

function genList({ items, rest }, context) {
  return genWithRest({
    type: "CallExpression",
    callee: LIST,
    arguments: [
      {
        type: "ArrayExpression",
        elements: items.map(item => generate(item, context))
      }
    ]
  }, rest, context);
}

function genMap({ items, rest }, context) {
  return genWithRest({
    type: "CallExpression",
    callee: MAP,
    arguments: [
      {
        type: "ArrayExpression",
        elements: items
          .map(({ key, value }) => ({
            type: "ArrayExpression",
            elements: [generate(key, context), generate(value, context)]
          }))
      }
    ]
  }, rest, context);
}

function genSpecAssert(spec, value, context) {
  return {
    type: "CallExpression",
    callee: ASSERT,
    arguments: [generate(spec, context), generate(value, context)]
  };
}

function genConstant({ lvalue, value }, context) {
  return genLValue(lvalue, value, context);
}

function genFunctionVariantName({ name }, { args }, context) {
  return {
    type: "Identifier",
    name: `${namify(name.name)}$${args.length}`
  };
}

function genFunctionVariantArgs(_, { args }, context) {
  return args.map((arg, i) => ({
    type: "Identifier",
    name: `$arg${i}`
  }));
}

function genFunctionVariantBody(_, variant, context) {
  const { args, body } = variant;
  return genFunctionVariantArgs(_, variant, context)
    .map((arg, i) => genLValue(args[i], arg, context))
    .reduce((a, b) => a.concat(b), [])
    .concat({
      type: "ReturnStatement",
      argument: generate(body, context)
    });
}

function genFunctionVariant(fun, variant, context) {
  context = context.spawn();
  return {
    type: "FunctionDeclaration",
    id: genFunctionVariantName(fun, variant, context),
    params: genFunctionVariantArgs(fun, variant, context),
    body: {
      type: "BlockStatement",
      body: genFunctionVariantBody(fun, variant, context)
    }
  };
}

function genFunctionDispatcher(fun, context) {
  const variants = fun.variants.map(variant => ({
    type: "SwitchCase",
    test: {
      type: "Literal",
      value: variant.args.length
    },
    consequent: [
      {
        type: "ReturnStatement",
        argument: {
          type: "CallExpression",
          callee: genFunctionVariantName(fun, variant, context),
          arguments: variant.args.map((_, i) => ({
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
  }));

  const badArity = {
    type: "SwitchCase",
    consequent: [BAD_ARITY]
  };

  const body = {
    type: "SwitchStatement",
    discriminant: ARITY,
    cases: variants.concat(badArity)
  };

  return {
    type: "FunctionDeclaration",
    id: generate(fun.name, context),
    params: [],
    body: {
      type: "BlockStatement",
      body: [body]
    }
  };
}

function genFunction(fun, context) {
  const spec = context.getSpec(fun.name);
  const variants = fun.variants
    .map(variant => genFunctionVariant(fun, variant, context));
  const dispatcher = genFunctionDispatcher(fun, context);
  if(spec) {
    const name = generate(fun.name, context);
    return variants.concat([
      dispatcher,
      {
        type: "AssignmentExpression",
        operator: "=",
        left: name,
        right: genSpecAssert(spec, name, context)
      }
    ]);
  }
  else {
    return variants.concat(dispatcher);
  }
}

function genRecordCtor({ name, args }, context) {
  return {
    type: "VariableDeclarator",
    id: genName(name, context),
    init: {
      type: "CallExpression",
      callee: RECORD,
      arguments: [
        {
          type: "Literal",
          value: name.name
        }
      ].concat(args.map(({ name }) => ({
        type: "Literal",
        value: name
      })))
    }
  };
}

function genRecordPredicate({ name }, context) {
  const x = {
    type: "Identifier",
    name: "x"
  };
  return {
    type: "VariableDeclarator",
    id: genName({ name: `is${name.name}` }, context),
    init: {
      type: "FunctionExpression",
      params: [x],
      body: {
        type: "BlockStatement",
        body: [
          {
            type: "ReturnStatement",
            argument: {
              type: "BinaryExpression",
              operator: "instanceof",
              left: x,
              right: genName(name, context)
            }
          }
        ]
      }
    }
  };
}

function genRecord(record, context) {
  const ctor = genRecordCtor(record, context);
  const predicate = genRecordPredicate(record, context);
  return {
    type: "VariableDeclaration",
    declarations: [
      ctor,
      predicate
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
  const specs = definitions.filter(({ type }) => type === "spec");
  for(let spec of specs) {
    context.defineSpec(spec);
  }
  definitions = definitions.filter(({ type }) => type !== "spec");
  return definitions
    .map(definition => genDefinition(definition, context))
    .reduce((a, b) => a.concat(b), []);
}

function genLambda(lambda, context) {
  context = context.spawn();
  const args = genFunctionVariantArgs(null, lambda, context);
  const body = genFunctionVariantBody(null, lambda, context);
  const badArity = {
    type: "IfStatement",
    test: {
      type: "BinaryExpression",
      operator: "!==",
      left: ARITY,
      right: {
        type: "Literal",
        value: args.length
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
  context = context.spawn();
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
      symbols = [
        {
          type: "VariableDeclarator",
          id: generate(value.name, context),
          init: generate(module, context)
        }
      ];
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
  return imports.map(_import => genImport(_import, context));
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
    case "literal": return genLiteral(ast, context);
    case "skip": return genSkip(ast, context);
    case "key": return genKey(ast, context);
    case "name": return genName(ast, context);
    case "property": return genProperty(ast, context);
    case "symbol": return genSymbol(ast, context);
    case "list": return genList(ast, context);
    case "map":  return genMap(ast, context);
    case "lambda": return genLambda(ast, context);
    case "monad": return genMonad(ast, context);
    case "case": return genCase(ast, context);
    case "scope": return genScope(ast, context);
    case "call": return genCall(ast, context);
    case "invoke": return genInvoke(ast, context);
    case "module": return genModule(ast, context);
    case "Program":
    case "BlockStatement":
    case "ClassBody":
    case "EmptyStatement":
    case "ExpressionStatement":
    case "IfStatement":
    case "LabeledStatement":
    case "BreakStatement":
    case "ContinueStatement":
    case "WithStatement":
    case "SwitchStatement":
    case "ReturnStatement":
    case "ThrowStatement":
    case "TryStatement":
    case "WhileStatement":
    case "DoWhileStatement":
    case "ForStatement":
    case "ForInStatement":
    case "ForOfStatement":
    case "DebuggerStatement":
    case "FunctionDeclaration":
    case "FunctionExpression":
    case "VariableDeclaration":
    case "VariableDeclarator":
    case "ClassDeclaration":
    case "ImportDeclaration":
    case "ExportDefaultDeclaration":
    case "ExportNamedDeclaration":
    case "ExportAllDeclaration":
    case "MethodDefinition":
    case "ClassExpression":
    case "ArrowFunctionExpression":
    case "ThisExpression":
    case "Super":
    case "RestElement":
    case "SpreadElement":
    case "YieldExpression":
    case "AwaitExpression":
    case "TemplateLiteral":
    case "TaggedTemplateExpression":
    case "ArrayExpression":
    case "ArrayPattern":
    case "ObjectExpression":
    case "Property":
    case "ObjectPattern":
    case "SequenceExpression":
    case "UnaryExpression":
    case "UpdateExpression":
    case "AssignmentExpression":
    case "AssignmentPattern":
    case "BinaryExpression":
    case "LogicalExpression":
    case "ConditionalExpression":
    case "NewExpression":
    case "CallExpression":
    case "MemberExpression":
    case "MetaProperty":
    case "Identifier":
    case "Literal":
    case "RegExpLiteral": return ast;
    default: throw new GenerationError(`Internal error: unknown AST type ${ast.type}.`, ast.location);
  }
}

module.exports = function(ast, options) {
  options = options || defaultOptions;
  const estree = generate(ast, new Context(options));
  return emit(estree);
};
