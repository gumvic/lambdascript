const native = require("./src/native");
const type = require("./src/type");
const meta = require("./src/meta");
const parse = require("./src/parse");
const check = require("./src/check");
const generate = require("./src/generate");

module.exports = {
  ...native,
  ...type,
  ...meta,
  ...parse,
  ...check,
  ...generate
};
