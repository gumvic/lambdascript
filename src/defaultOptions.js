module.exports = {
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

        "done": "done",
        "isDone": "isDone",
        "iterate": "iterate",

        "monad": "monad",
        "isMonad": "isMonad",

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
