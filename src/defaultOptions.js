module.exports = {
  core: {
    alias: "core",
    module: "monada-core",
    names: [
      /* Primitives */
      "type",
      "instance?",
      "==",
      "+",
      "-",
      "*",
      "/",
      "%",
      ">",
      "<",
      ">=",
      "<=",
      "~",
      "|",
      "&",
      "^",
      ">>",
      "<<",
      ">>>",
      "!",
      "||",
      "&&",
      /* Fun */
      "compose",
      /* Collections */
      "size",
      "toJS",
      "fromJS",
      "ImMap",
      "ImList",
      /* Transducers */
      "transduce"
      /* Monads */
    ]
  }
};
