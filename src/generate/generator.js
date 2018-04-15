/* location is
{ start: { offset: 18, line: 3, column: 1 },
  end: { offset: 18, line: 3, column: 1 } }
*/
class GenerationError {
  constructor(message, location) {
    this.message = message;
    this.location = location || {
      start: {},
      end: {}
    };
  }
}

class Scope {
  constructor(parent) {
    this.parent = parent;
    this.defined = [];
  }

  define(name, location) {
    if (this.defined.indexOf(name) >= 0) {
      throw new GenerationError(`Duplicate: ${name}`, location);
    }
    else {
      this.defined.push(name);
    }
  }

  isDefined(name) {
    return (
      this.defined.indexOf(name) >= 0 ||
      (this.parent && this.parent.isDefined(name))
    );
  }

  child() {
    return new Scope(this);
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

function genNumber(ast) {
  return ast.value.toString();
}

function genString(ast) {
  return `"${ast.value}"`;
}

function genIdentifier(ast, scope) {
  const name = ast.name;
  if (!scope.isDefined(name)) {
    throw new GenerationError(`Identifier not defined: ${name}`,ast.location);
  }
  return name;
}

function genMap(ast, scope) {
  // TODO
}

function genVector(ast, scope) {
  //const items = ast.items.map(generate).join(",");
  //return "[" + items + "]";
  // TODO
}

function genLambda(ast, scope) {
  scope = scope.child();
  for(let arg of ast.args) {
    scope.define(arg, ast.location);
  }
  const args = ast.args.join(",");
  const body = generate(ast.body, scope);
  return `(${args})=>${body}`;
}

function genJoin(ast, scope) {
  return generate({
    type: "call",
    fun: {
      type: "identifier",
      name: "join",
      location: ast.location
    },
    args: [
      ast.left,
      {
        type: "lambda",
        args: [ast.via],
        body: ast.right,
        location: ast.right.location
      }
    ]
  }, scope);
}

function genCase(ast, scope) {
  const branches = ast.branches;
  function f(branches) {
    if (!branches.length) {
      return null;
    }
    const branch = branches[0];
    const rest = branches.slice(1);
    const condition = generate(branch.condition, scope);
    const ifTrue = generate(branch.value, scope);
    const ifFalse = generate(f(rest) || ast.otherwise, scope);
    return `(${condition} ? ${ifTrue} : ${ifFalse})`;
  }
  return f(branches);
}

function genLet(ast, scope) {
  scope = scope.child();
  for(let definition of ast.definitions) {
    scope.define(definition.name, definition.location);
  }
  const definitions = ast.definitions
    .map((definition) => `const ${definition.name}=${generate(definition.value, scope)};`)
    .join("");
  const body = generate(ast.body, scope);
  return `((()=>{${definitions}return ${body};})())`;
}

function genCall(ast, scope) {
  if (ast.fun.type === "operator") {
    return genOperatorCall(ast, scope);
  }
  else {
    return genFunctionCall(ast, scope);
  }
}

function genFunctionCall(ast, scope) {
  // TODO wrap in braces values that js won't call
  const fun = generate(ast.fun, scope);
  const args = ast.args
    .map((arg) => generate(arg, scope))
    .join(",");
  return `${fun}(${args})`;
}

function genOperatorCall(ast, scope) {
  const operator = ast.fun.name;
  if (ast.args.length === 1) {
    const left = generate(ast.args[0], scope);
    return `${operator}${left}`;
  }
  else if (ast.args.length === 2) {
    const left = generate(ast.args[0], scope);
    const right = generate(ast.args[1], scope);
    return `${left}${operator}${right}`;
  }
  else throw new GenerationError(`Internal compiler error: wrong number of arguments: ${args.length}.`, ast.location);
}

function genOperator(ast, scope) {
  throw new GenerationError(`Internal compiler error: not implemented.`, ast.location);
}

function genAccess(ast, scope) {
  const object = generate(ast.object, scope);
  return `${object}.${ast.property}`;
}

function genImport(ast, scope) {
  scope.define(ast.alias, ast.location);
  for(let name of ast.globals) {
    scope.define(name, ast.location);
  }
  const globals = ast.globals
    .map((name) => `const ${name}=${ast.alias}.${name};`)
    .join("");
  return `const ${ast.alias}=require("${ast.module}");${globals}`;
}

const defaultImports = [
  {
    type: "import",
    alias: "core",
    module: "muscript-core",
    globals: ["join"]
  }
];

function genExport(_export, scope) {
  if(_export) {
    return `module.exports=${generate(_export, scope)};`;
  }
  else {
    return "";
  }
}

function genModule(ast, scope) {
  scope = new Scope();
  const moduleImports = defaultImports.concat(ast.imports);
  const deps = moduleImports.map(({ module }) => module);
  const imports = moduleImports
    .map((_import) => genImport(_import, scope))
    .join("");
  for(let definition of ast.definitions) {
    scope.define(definition.name, definition.location);
  }
  const definitions = ast.definitions
    .map((definition) => `const ${definition.name}=${generate(definition.value, scope)};`)
    .join("");
  const _export = genExport(ast.export, scope);
  const js = `${imports}${definitions}${_export}`;
  return { deps, js };
}

function generate(ast, scope) {
  if(!scope) {
    scope = new Scope();
  }
  switch (ast.type) {
    case "undefined": return genUndefined(ast, scope);
    case "null": return genNull(ast, scope);
    case "false": return genFalse(ast, scope);
    case "true": return genTrue(ast, scope);
    case "number": return genNumber(ast, scope);
    case "string": return genString(ast, scope);
    case "identifier": return genIdentifier(ast, scope);
    case "map":  return genMap(ast, scope);
    case "vector": return genVector(ast, scope);
    case "lambda": return genLambda(ast, scope);
    case "join": return genJoin(ast, scope);
    case "case": return genCase(ast, scope);
    case "let": return genLet(ast, scope);
    case "call": return genCall(ast, scope);
    case "access": return genAccess(ast, scope);
    case "module": return genModule(ast, scope);
    default: throw new GenerationError(`Internal compiler error: unknown AST type ${ast.type}.`, ast.location);
  }
}

module.exports = {
  GenerationError: GenerationError,
  generate: generate
};
