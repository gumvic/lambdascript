const { generate: emit } = require("astring");
const GenerationError = require("./error");

const GLOBAL = {
  type: "Identifier",
  name: "global"
};

const IMMUTABLE = {
  type: "Identifier",
  name: "immutable"
};

const IMMUTABLE_LIST = {
  type: "MemberExpression",
  object: IMMUTABLE,
  property: {
    type: "Identifier",
    name: "List"
  },
  computed: false
};

const IMMUTABLE_MAP = {
  type: "MemberExpression",
  object: IMMUTABLE,
  property: {
    type: "Identifier",
    name: "Map"
  },
  computed: false
};

class Context {
  constructor(parent) {
    this.parent = parent;
  }

  spawn() {
    return new Context(this);
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
    callee: IMMUTABLE_LIST,
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
    callee: IMMUTABLE_MAP,
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

function genFunctionDefinition(fun, context) {
  return {
    type: "VariableDeclaration",
    declarations: [
      {
        type: "VariableDeclarator",
        id: generate(fun.name, context),
        init: genFunction(fun, context)
      }
    ],
    kind: "const"
  };
}

function genDefinition(definition, context) {
  switch(definition.type) {
    case "definition.constant": return genConstantDefinition(definition, context);
    case "definition.function": return genFunctionDefinition(definition, context);
    default: throw new GenerationError(`Internal error: unknown AST type ${definition.type}.`, definition.location);
  }
}

function genDefinitions(definitions, context) {
  return definitions
    .map(definition => genDefinition(definition, context))
    .reduce((a, b) => a.concat(b), []);
}

function genFunction(fun, context) {

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

function genProgramConstantDefinition({ name, value }, context) {
  return {
    type: "AssignmentExpression",
    operator: "=",
    left: {
      type: "MemberExpression",
      object: GLOBAL,
      property: generate(name, context),
      computed: false
    },
    right: generate(value, context)
  };
}

function genProgramFunctionDefinition(fun, context) {
  return {
    type: "AssignmentExpression",
    operator: "=",
    left: {
      type: "MemberExpression",
      object: GLOBAL,
      property: generate(fun.name, context),
      computed: false
    },
    right: genFunction(fun, context)
  };
}

function genProgramStep(step, context) {
  switch(step.type) {
    case "definition.constant": return genProgrConstantDefinition(definition, context);
    case "definition.function": return genProgramFunctionDefinition(definition, context);
    default: return generate(step, context);
  }
}

function genProgram({ steps }, context) {
  return {
    type: "Program",
    body: steps.map((step) => genProgramStep(step, context))
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
    case "program": return genProgram(ast, context);
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
