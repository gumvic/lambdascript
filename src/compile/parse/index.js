const parser = require("./parser");
const SyntaxError = require("./error");

function parse(src) {
  try {
    return parser.parse(src);
  }
  catch(e) {
    throw new SyntaxError(e.message, e.location);
  }
}

module.exports = {
  parse
};
