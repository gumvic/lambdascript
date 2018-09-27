const parser = require("./parser");
const Error = require("../error");

function parse(src) {
  try {
    return parser.parse(src);
  }
  catch(e) {
    throw new Error(e.message, e.location);
  }
}

module.exports = {
  parse
};
