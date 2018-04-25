/*const parse = require("../parse");
const check = require("../check");
const generate = require("../generate");

const defaultImports = [
  {
    type: "import",
    alias: "core",
    module: "core",
    globals: ["join"]
  }
];

function compileModule(ast) {

}

function compileExpression(ast) {

}

function compile(mu) {
  let ast = parse(mu);
  ast.imports = defaultImports.concat(ast.imports);
  check(ast);
  const js = generate(ast);
  const deps = ast.type === "module" ?
    ast.imports.map(({ module }) => module) :
    [];
  return { js, deps };
}

module.exports = compile;*/
