module.exports = {
  core: {
    alias: "core",
    module: "monada-core",
    names: [
      /* Primitives */
      "type",
      "isa",
      /* Operators */
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
      /* Collections */
      "size",
      "toJS",
      "fromJS",
      "ImMap",
      "ImList",
      /* Transducers */
      "transduce",
      /* Monads */
      "monad",
      "isMonad"
    ]
  }
};
