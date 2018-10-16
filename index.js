const native = require("./src/native");
const meta = require("./src/meta");
const parse = require("./src/parse");
const check = require("./src/check");
const generate = require("./src/generate");
const eval = require("./src/eval");

module.exports = {
  ...native,
  ...meta,
  ...parse,
  ...check,
  ...generate,
  ...eval
};
