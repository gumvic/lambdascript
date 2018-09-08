const { generate: emit } = require("astring");
const GenerationError = require("./error");

const REQUIRE = {
  type: "Identifier",
  name: "require"
};

const VALUE = {
  type: "Identifier",
  name: "value"
};

const LIST = {
  type: "Identifier",
  name: "list"
};

const MAP = {
  type: "Identifier",
  name: "map"
};

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

class Context {

}

function genSkip(ast, context) {
  return genUndefined(ast, context);
}

function genUndefined(_, context) {
  return {
    type: "Identifier",
    value: "undefined"
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

function genName({ name }, context) {
  return {
    type: "Identifier",
    name: namify(name)
  };
}

function genList({ items }, context) {
  return {
    type: "CallExpression",
    callee: LIST,
    arguments: [
      {
        type: "ArrayExpression",
        elements: items.map((item) => generate(item, context))
      }
    ]
  };
}

function genMap({ items }, context) {
  return {
    type: "CallExpression",
    callee: MAP,
    arguments: [
      {
        type: "ArrayExpression",
        elements: items.map(({ key, value }) => ({
          type: "ArrayExpression",
          elements: [generate(key, context), generate(value, context)]
        }))
      }
    ]
  };
}

function genFunction({ args, body }, context) {
  return {
    type: "ArrowFunctionExpression",
    params: args.map((arg) => genName(arg, context)),
    body: generate(body, context)
  };
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
      type: "ArrowFunctionExpression",
      params: [],
      body: {
        type: "BlockStatement",
        body: definitions
          .map(definition => genDefinition(definition, context))
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

function genConstantDefinition({ name, value }, context) {
  return {
    type: "VariableDeclaration",
    declarations: [
      {
        type: "VariableDeclarator",
        id: generate(name, context),
        init: generate(value, context)
      }
    ],
    kind: "const"
  };
}

function genFunctionDefinition({ name, args, body }, context) {
  return {
    type: "FunctionDeclaration",
    id: generate(name, context),
    params: args.map((arg) => genName(arg, context)),
    body: {
      type: "BlockStatement",
      body: [
        {
          type: "ReturnStatement",
          argument: generate(body, context)
        }
      ]
    }
  };
}

function genDefinition(ast, context) {
  switch(ast.kind) {
    case "constant": return genConstantDefinition(ast, context);
    case "function": return genFunctionDefinition(ast, context);
    default: throw new GenerationError(`Internal error: unknown AST definition kind ${ast.kind}.`, ast.location);
  }
}

/*function genImportMonadaName(name, context) {
  return {
    type: "Property",
    kind: "init",
    key: {
      type: "Literal",
      value: name.name
    },
    value: {
      type: "ObjectPattern",
      properties: [
        {
          type: "Property",
          kind: "init",
          key: VALUE,
          value: generate(name, context)
        }
      ]
    }
  };
}

function genImportNativeName(name, context) {
  return {
    type: "Property",
    kind: "init",
    key: {
      type: "Literal",
      value: name.name
    },
    value: {
      type: "ObjectPattern",
      properties: [
        {
          type: "Property",
          kind: "init",
          shorthand: true,
          value: generate(name, context)
        }
      ]
    }
  };
}*/

function genImportRequire(module, context) {
  return {
    type: "CallExpression",
    callee: REQUIRE,
    arguments: [
      {
        type: "Literal",
        value: module.name
      }
    ]
  };
}

function genImportSome({ module, names, $module }, context) {
  return {
    type: "VariableDeclaration",
    declarations: [
      {
        type: "VariableDeclarator",
        id: {
          type: "ObjectPattern",
          properties: names.map((name) => ({
            type: "Property",
            kind: "init",
            key: {
              type: "Literal",
              value: name.name
            },
            value: {
              type: "ObjectPattern",
              properties: [
                {
                  type: "Property",
                  kind: "init",
                  key: VALUE,
                  value: generate(name, context)
                }
              ]
            }
          }))
        },
        init: genImportRequire(module, context)
      }
    ],
    kind: "const"
  };
}

function genImportAll({ module, $module }, context) {
  const names = Object.keys($module)
    .map((name) => ({
      type: "name",
      name
    }));
  return genImportSome({ module, names, $module }, context);
}

function genImport(ast, context) {
  switch(ast.kind) {
    case "some": return genImportSome(ast, context);
    case "all": return genImportAll(ast, context);
    default: throw new GenerationError(`Internal error: unknown AST import kind ${ast.kind}.`, ast.location);
  }
}

function genExportSome(ast, context) {
  // TODO
}

function genExportAll(ast, context) {
  // TODO
}

function genExport(ast, context) {
  switch(ast.kind) {
    case "some": return genExportSome(ast, context);
    case "all": return genExportAll(ast, context);
    default: throw new GenerationError(`Internal error: unknown AST import kind ${ast.kind}.`, ast.location);
  }
}

function genModule({ imports, definitions, export: _export }, context) {
  imports = imports.map((_import) => genImport(_import, context));
  definitions = definitions.map((definition) => genDefinition(definition, context));
  _export = _export ? genExport(_export, context) : { type: "EmptyStatement" };
  return {
    type: "Program",
    body: [...imports, ...definitions, _export]
  };
}

function generate(ast, context) {
  switch (ast.type) {
    case "skip": return genSkip(ast, context);
    case "undefined": return genUndefined(ast, context);
    case "null": return genNull(ast, context);
    case "false": return genFalse(ast, context);
    case "true": return genTrue(ast, context);
    case "number": return genNumber(ast, context);
    case "string": return genString(ast, context);
    case "name": return genName(ast, context);
    case "list": return genList(ast, context);
    case "map":  return genMap(ast, context);
    case "function": return genFunction(ast, context);
    case "case": return genCase(ast, context);
    case "scope": return genScope(ast, context);
    case "call": return genCall(ast, context);
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

module.exports = function(ast) {
  const estree = generate(ast, new Context());
  return emit(estree);
};
