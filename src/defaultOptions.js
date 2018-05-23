module.exports = {
  essentials: {
    list: "ImList",
    map: "ImMap",
    get: "get",
    monad: "Monad",
    run: "run"
  },
  main: "main",
  autoImports: [
    {
      module: "monada-core",
      value: {
        "type": "type",
        "isa": "isa",
        "panic": "panic",
        "dontPanic": "dontPanic",
        "undefined": "undefined",
        "null": "null",
        "true": "true",
        "false": "false",

        "==": "==",
        "+": "+",
        "-": "-",
        "*": "*",
        "/": "/",
        "%": "%",
        ">": ">",
        "<": "<",
        ">=": ">=",
        "<=": "<=",
        "~": "~",
        "|": "|",
        "&": "&",
        "^": "^",
        ">>": ">>",
        "<<": "<<",
        ">>>": ">>>",
        "!": "!",
        "||": "||",
        "&&": "&&",
        "iterate": "iterate",

        "Done": "Done",
        "Monad": "Monad",

        "size": "size",
        "fromJS": "fromJS",
        "toJS": "toJS",
        "ImMap": "ImMap",
        "ImList": "ImList",
        "get": "get",
        "getIn": "getIn",

        "map": "map",
        "filter": "filter",

        "~>": "~>",
        "<~": "<~",

        "run": "run"
      }
    }
  ]
};
