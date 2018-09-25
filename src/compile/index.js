const { define } = require("../meta");
const { parse } = require("./parse");
const { check } = require("./check");
const { generate } = require("./generate");

function compile(src) {
  return eval(generate(check(parse(src))));
}

module.exports = {
  parse,
  check,
  generate,
  compile
};
