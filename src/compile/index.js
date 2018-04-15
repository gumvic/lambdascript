const parse = require("../parse");
const check = require("../check");
const generate = require("../generate");

const Error = require("./error");

const defaultImports = [
  {
    type: "import",
    alias: "core",
    module: "muscript-core",
    globals: ["join"]
  }
];

function compile(mu) {
  const ast = parse(mu);
  check(ast);
  const js = generate(ast);

  const deps = ast.type === "module" ?
    defaultImports.concat(ast.imports).map(({ module }) => module) :
    [];

  return { js, deps };
}

module.exports = compile;
