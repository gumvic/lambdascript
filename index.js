const native = require("./src/native");
const type = require("./src/type");
const meta = require("./src/meta");
const compile = require("./src/compile");

module.exports = {
  ...native,
  ...type,
  ...meta,
  ...compile
};
