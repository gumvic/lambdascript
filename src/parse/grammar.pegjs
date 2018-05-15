ast = _ ast:(module / value) _ {
  return ast;
}

_ "whitespace" = [ \t\n\r]*

reservedWord "reserved word" =
  wordAs
  / wordFn
  / wordCase
  / wordLet
  / wordDo
  / wordDef
  / wordDefn
  / wordModule
  / wordImport
  / wordExport

wordAs "as" = "as" !beginNameChar
wordFn "fn" = "fn" !beginNameChar
wordDef "def" = "def" !beginNameChar
wordDefn "defn" = "defn" !beginNameChar
wordCase "case" = "case" !beginNameChar
wordLet "let" = "let" !beginNameChar
wordDo "do" = "do" !beginNameChar
wordModule "module" = "module" !beginNameChar
wordImport "import" = "import" !beginNameChar
wordExport "export" = "export" !beginNameChar

beginNameChar = [a-zA-Z_\+\-\*\/\>\<\=\%\!\|\&|\^|\~\?]
nameChar = [0-9a-zA-Z_\+\-\*\/\>\<\=\%\!\|\&|\^|\~\?\.]
name "name" =
  first:beginNameChar
  rest:(nameChar+)?
  {
    return {
      type: "name",
      name: [first].concat(rest || []).join(""),
      location: location()
    };
  }

undefined "undefined" = "undefined" {
  return {
    type: "undefined",
    location: location()
  };
}

null "null" = "null" {
  return {
    type: "null",
    location: location()
  };
}

false "false" = "false" {
  return {
    type: "false",
    location: location()
  };
}

true "true" = "true" {
  return {
    type: "true",
    location: location()
  };
}

decimal_point = "."
digit1_9      = [1-9]
e             = [eE]
exp           = e (minus / plus)? DIGIT+
frac          = decimal_point DIGIT+
int           = zero / (digit1_9 DIGIT*)
minus         = "-"
plus          = "+"
zero          = "0"
number "number" = int frac? exp? {
  return {
    type: "number",
    value: text(),
    location: location()
  };
}

char
  = unescaped
  / escape
    sequence:(
        '"'
      / "\\"
      / "/"
      / "b" { return "\b"; }
      / "f" { return "\f"; }
      / "n" { return "\n"; }
      / "r" { return "\r"; }
      / "t" { return "\t"; }
      / "u" digits:$(HEXDIG HEXDIG HEXDIG HEXDIG) {
          return String.fromCharCode(parseInt(digits, 16));
        }
    )
    { return sequence; }
escape         = "\\"
quotation_mark = '"'
unescaped      = [\x20-\x21\x23-\x5B\x5D-\u10FFFF]
DIGIT  = [0-9]
HEXDIG = [0-9a-f]i
string "string" = quotation_mark chars:char* quotation_mark {
  return {
    type: "string",
    value: chars.join(""),
    location: location()
  };
}

demapKeyName = key:(key / number / string) _ name:decomp {
  return {
    key: key,
    name: name
  };
}

demapName = name:name {
  return {
    key: {
      type: "key",
      name: name.name,
      location: name.location
    },
    name: name
  };
}

demapItem = demapKeyName / demapName

demap = "{" _
  items:(first:demapItem rest:(_ item:demapItem { return item; })* { return [first].concat(rest); })
  alias:(_ wordAs _ alias:name { return alias; })?
  _ "}" {
  if (alias) {
    return {
      type: "alias",
      name: alias,
      value: {
        type: "demap",
        items: items
      }
    };
  }
  else {
    return {
      type: "demap",
      items: items
    };
  }
}

decomp = name / demap

keyChar = [0-9a-zA-Z_\+\-\*\/\>\<\=\%\!\|\&|\^|\~\?\.]
key = chars:keyChar+ ":" {
  return {
    type: "key",
    name: chars.join(""),
    location: location()
  };
}

list "list" =
  "[" _
  items:(first:value rest:(_ item:value { return item; })* { return [first].concat(rest); })?
  _ "]" {
    return {
      type: "list",
      items: items || [],
      location: location()
    };
  }

mapItem = key:value _ value:value {
  return {
    key: key,
    value: value,
    location: location()
  };
}

map "map" =
  "{" _
  items:(first:mapItem rest:(_ item:mapItem { return item; })* { return [first].concat(rest); })?
  _ "}" {
    return {
      type: "map",
      items: items || [],
      location: location()
    };
  }

args =
  "(" _
  args:(first:decomp rest:(_ arg:decomp { return arg; })* { return [first].concat(rest); })?
  _ ")" {
    return args || [];
  }

variant = args:args _ body:value {
  return {
    args: args,
    body: body,
    location: location()
  };
}

lambda "lambda" = "(" _
  wordFn _
  variants:(first:variant rest:(_ variant:variant { return variant; })* { return [first].concat(rest); })
  _ ")" {
  return {
    type: "lambda",
    variants: variants,
    location: location()
  };
}

caseBranch = condition:value _ value:value {
  return {
    condition: condition,
    value: value,
    location: location()
  };
}

case "case" =
  "(" _ wordCase _
  branches:(first:caseBranch rest:(_ branch:caseBranch { return branch; })* { return [first].concat(rest); })
  _ otherwise:value
  _ ")" {
    return {
      type: "case",
      branches: branches,
      otherwise: otherwise,
      location: location()
    };
  }

scope "scope" =
  "(" _
  wordLet
  _
  definitions:(first:definition rest:(_ definition:definition { return definition; })* { return [first].concat(rest); })
  _
  body:value
  _ ")" {
    return {
      type: "scope",
      definitions: definitions,
      body: body,
      location: location()
    };
  }

monadDefinition = "(" _ wordDef _ via:name _ value:value _ ")" {
  return {
    via: via,
    value: value
  };
}

monadStep = value:value {
  return {
    value: value
  };
}

monadItem = monadDefinition / monadStep

monad "monad" =
  "(" _ wordDo _
  items:(first:monadItem rest:(_ item:monadItem { return item; })* { return [first].concat(rest); })
  _ ")" {
    return {
      type: "monad",
      items: items,
      location: location()
    };
  }

value =
  undefined
  / null
  / false
  / true
  / number
  / string
  / key
  / name
  / list
  / map
  / lambda
  / case
  / scope
  / monad
  / invoke
  / call

fun = (!reservedWord name:name { return name; }) / lambda / call

call =
  "(" _ fun:fun
  _
  args:(first:value rest:(_ arg:value { return arg; })* { return [first].concat(rest); })?
  _
  _ ")" {
  return {
    type: "call",
    fun: fun,
    args: args || [],
    location: location()
  };
}

invoke =
  "(" _ method:("." name:name { return name; })
  _
  object:value
  _
  args:(first:value rest:(_ arg:value { return arg; })* { return [first].concat(rest); })?
  _
  _ ")" {
  return {
    type: "invoke",
    object: object,
    method: method,
    args: args || [],
    location: location()
  };
}

constantDefinition = "(" _ wordDef _ name:decomp _ value:value _ ")" {
  return {
    type: "constant",
    name: name,
    value: value,
    location: location()
  };
}

functionDefinition "function definition" =
  "(" _
  wordDefn _ name:name
  _
  variants:(first:variant rest:(_ variant:variant { return variant; })* { return [first].concat(rest); })
  _ ")" {
  return {
    type: "function",
    name: name,
    variants: variants,
    location: location()
  };
}

definition = constantDefinition / functionDefinition

import =
  "(" _ wordImport _ module:name _
  names:(first:name rest:(_ name:name { return name; })* { return [first].concat(rest); })?
  _ ")" {
  return {
    type: "import",
    module: module,
    names: names || [],
    location: location()
  };
}

export = "(" _ wordExport _
names:(first:name rest:(_ name:name { return name; })* { return [first].concat(rest); })
")" {
  return {
    type: "export",
    names: names,
    location: location()
  };
}

module "module" =
  "(" _ wordModule _ name:name _
  imports:(first:import rest:(_ _import:import { return _import; })* { return [first].concat(rest); })?
  _
  _export:export
  _ ")"
  _
  definitions:(first:definition rest:(_ definition:definition { return definition; })* { return [first].concat(rest); })
  _
   {
  return {
    type: "module",
    name: name,
    imports: imports || [],
    definitions: definitions,
    export: _export,
    location: location()
  };
}
