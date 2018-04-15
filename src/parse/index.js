const Error = require("./error");
const parser = require("./parser");

class SyntaxError {
  constructor(message, location) {
    this.message = message;
    this.location = location;
  }
}

function parse(src) {
  try {
    return parser.parse(src);
  }
  catch(e) {
    throw new SyntaxError(e.message, e.location);
  }
}

module.exports = parse;
