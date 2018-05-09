module.exports = {
  core: {
    alias: "core",
    module: "monada-core",
    names: [
      /* Primitives */
      "type",
      "isa",
      "try",
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
      "get",
      "getIn",
      "invoke",
      "invokeIn",
      /* Transducers */
      "transduce",
      /* Monads */
      "monad",
      "isMonad"
    ]
  }
};
