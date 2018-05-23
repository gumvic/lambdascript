module.exports = {
  "essentials": {
    "list": "ImList",
    "map": "ImMap",
    "get": "get",
    "record": "Record",
    "monad": "Monad"
  },
  "app": {
    "main": "main",
    "run": "run"
  },
  "autoImports": [
    {
      "module": "monada-core",
      "value": {
        "ImMap": "ImMap",
        "ImList": "ImList",
        "get": "get",
        "Record": "Record",
        "Monad": "Monad",

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

        "size": "size",
        "fromJS": "fromJS",
        "toJS": "toJS",
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
