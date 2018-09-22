const { generate: emit } = require("astring");
const GenerationError = require("./error");
const { namify } = require("../utils");

const NOOP = {
  type: "EmptyStatement"
};

const GLOBAL = {
  type: "Identifier",
  name: "global"
};

const LIST = {
  type: "Identifier",
  name: "list"
};

const MAP = {
  type: "Identifier",
  name: "map"
};

const MATCH = {
  type: "Identifier",
  name: "match"
};

class GlobalContext {
  isGlobal() {
    return true;
  }

  spawn() {
    return new LocalContext(this);
  }
}

class LocalContext {
  constructor(parent) {
    this.parent = parent;
  }

  isGlobal() {
    return false;
  }

  spawn() {
    return new LocalContext(this);
  }
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
  context = context.spawn();
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

function genMatch({ names, branches, otherwise }, context) {
  function _generate(branches, context) {
    if (!branches.length) {
      return generate(otherwise, context);
    }
    const { patterns, value } = branches[0];
    const rest = branches.slice(1);
    const condition = patterns
      .map((pattern, i) => ({
        type: "CallExpression",
        callee: MATCH,
        arguments: [generate(pattern, context), generate(names[i], context)]
      }))
      .reduce((left, right) => ({
        type: "LogicalExpression",
        operator: "&&",
        left,
        right
      }));
    const ifTrue = generate(value, context);
    const ifFalse = _generate(rest, context);
    return {
      type: "ConditionalExpression",
      test: condition,
      consequent: ifTrue,
      alternate: ifFalse
    };
  }
  return _generate(branches, context);
}

function genScope({ definitions, body }, context) {
  context = context.spawn();
  definitions = definitions.map((definition) => genDefinition(definition, context));
  body = generate(body, context);
  return {
    type: "CallExpression",
    callee: {
      type: "ArrowFunctionExpression",
      params: [],
      body: {
        type: "BlockStatement",
        body: [
          ...definitions,
          {
            type: "ReturnStatement",
            argument: body
          }
        ]
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

function genDeclarationDefinition(ast, context) {
  return NOOP;
}

function genConstantDefinition({ name, value }, context) {
  if (context.isGlobal()) {
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
  else {
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
}

function genFunctionDefinition({ name, args, body, location }, context) {
  if (context.isGlobal()) {
    return {
      type: "AssignmentExpression",
      operator: "=",
      left: {
        type: "MemberExpression",
        object: GLOBAL,
        property: generate(name, context),
        computed: false
      },
      right: genFunction({ args, body, location }, context)
    };
  }
  else {
    return {
      type: "VariableDeclaration",
      declarations: [
        {
          type: "VariableDeclarator",
          id: generate(name, context),
          init: genFunction({ args, body, location }, context)
        }
      ],
      kind: "const"
    };
  }
}

function genDefinition(ast, context) {
  switch(ast.kind) {
    case "declaration": return genDeclarationDefinition(ast, context);
    case "constant": return genConstantDefinition(ast, context);
    case "function": return genFunctionDefinition(ast, context);
    default: throw new GenerationError(`Internal error: unknown AST definition kind ${ast.kind}.`, ast.location);
  }
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
    case "match": return genMatch(ast, context);
    case "scope": return genScope(ast, context);
    case "call": return genCall(ast, context);
    case "definition": return genDefinition(ast, context);
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
  const estree = generate(ast, new GlobalContext());
  return emit(estree);
};
