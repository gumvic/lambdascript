const parser = require("./parser");
const CompilationError = require("../error");

function parse(src) {
  try {
    return parser.parse(src);
  }
  catch(e) {
    throw new CompilationError(e.message, e.location);
  }
}

module.exports = {
  parse
};
