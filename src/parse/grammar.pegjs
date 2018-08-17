program = statements:(statement:(definition / expression) _ { return statement; })+ {
  return {
    type: "program",
    statements: statements
  };
}

_ "whitespace" = ([ \t\n\r] / comment)*

nl = [\n\r] / [\n]

oneLineComment = "#" (!nl .)*
multilineComment = "#{" (multilineComment / (!"}#" .))* "}#"
comment = multilineComment / oneLineComment

reservedWord "special word" =
  wordCase
  / wordWhen
  / wordElse
  / wordDo
  / wordReturn
  / wordLet
  / wordVal
  / wordFn
  / wordIn
  / wordModule
  / wordImport
  / wordExport

wordCase "case" = "case" !beginNameChar
wordWhen "when" = "when" !beginNameChar
wordElse "else" = "else" !beginNameChar
wordDo "do" = "do" !beginNameChar
wordReturn "return" = "return" !beginNameChar
wordLet "let" = "let" !beginNameChar
wordVal "val" = "val" !beginNameChar
wordFn "fn" = "fn" !beginNameChar
wordIn "in" = "in" !beginNameChar
wordModule "module" = "module" !beginNameChar
wordImport "import" = "import" !beginNameChar
wordExport "export" = "export" !beginNameChar

beginNameChar = [a-zA-Z_]
nameChar = [0-9a-zA-Z_']
name "name" =
  !reservedWord
  first:beginNameChar
  rest:(nameChar+)?
  {
    return {
      type: "name",
      name: [first].concat(rest || []).join(""),
      location: location()
    };
  }

beginRecordNameChar = [A-Z]
recordNameChar = [0-9a-zA-Z_']
recordName "record name" =
  !reservedWord
  first:beginRecordNameChar
  rest:(recordNameChar+)?
  {
    return {
      type: "name",
      name: [first].concat(rest || []).join(""),
      location: location()
    };
  }

moduleNameChar = [0-9a-zA-Z_\.\+\-\*\/\>\<\=\%\!\|\&|\^|\~\?]
moduleName "module name" =
  !reservedWord
  chars:moduleNameChar+
  {
    return {
      type: "name",
      name: chars.join(""),
      location: location()
    };
  }

reservedOperator = ("=" / "->") !operatorChar
operatorChar = [\+\-\*\/\>\<\=\%\!\|\&|\^|\~\?\$]
operator "operator" =
  !reservedOperator
  chars:operatorChar+ {
  return {
    type: "name",
    name: chars.join(""),
    location: location()
  };
}

skip "_" = "_" !beginNameChar {
  return {
    type: "skip",
    location: location()
  };
}

undefined "undefined" = "undefined" !beginNameChar {
  return {
    type: "undefined",
    location: location()
  };
}

null "null" = "null" !beginNameChar {
  return {
    type: "null",
    location: location()
  };
}

false "false" = "false" !beginNameChar {
  return {
    type: "false",
    location: location()
  };
}

true "true" = "true" !beginNameChar {
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

listItem = expression

list "list" =
  "[" _
  items:(first:listItem rest:(_ "," _ item:listItem { return item; })* { return [first].concat(rest); })?
  _ "]" {
    return {
      type: "list",
      items: items || [],
      location: location()
    };
  }

mapKeyValueItem = key:expression _ ":" _ value:expression {
  return {
    key: key,
    value: value
  };
}

mapKeyItem = key:name {
  return {
    key: key,
    value: key
  };
}

mapItem = mapKeyValueItem / mapKeyItem

map "map" =
  "{" _
  items:(first:mapItem rest:(_ "," _ item:mapItem { return item; })* { return [first].concat(rest); })?
  _ "}" {
    return {
      type: "map",
      items: items || [],
      location: location()
    };
  }

argsList =
  "(" _
  args:(first:name rest:(_ "," _ arg:name { return arg; })* { return [first].concat(rest); })? _
  _ ")" {
  return args || [];
}

function = wordFn _ args:argsList _ "->" _ body:expression {
  return {
    type: "function",
    args: args,
    body: body,
    location: location()
  };
}

caseBranch = wordWhen _ condition:expression _ ":" _ value:expression {
  return {
    condition: condition,
    value: value
  };
}

caseOtherwise = wordElse _ ":" _ otherwise:expression {
  return otherwise;
}

case "case" = wordCase _ branches:(branch:caseBranch _ { return branch; })+ otherwise:caseOtherwise {
  return {
    type: "case",
    branches: branches,
    otherwise: otherwise,
    location: location()
  };
}

definitionConstant = wordVal _ name:name _ "=" _ value:expression {
  return {
    type: "definition.constant",
    name: name,
    value: value,
    location: location()
  };
}

definitionFunction = wordFn _ name:name _ args:argsList _ "->" _ body:expression {
  return {
    type: "definition.function",
    name: name,
    args: args,
    body: body,
    location: location()
  };
}

definition = definitionConstant / definitionFunction

scope "let" =
  wordLet _
  definitions:(definition:definition _ { return definition; })+ _
  wordIn _
  body:(wordIn _ body:expression { return body; }) {
  return {
    type: "scope",
    definitions: definitions,
    body: body,
    location: location()
  };
}

subExpression "sub-expression" = "(" _ expression:expression _ ")" {
  return expression;
}

atom =
  undefined
  / null
  / false
  / true
  / number
  / string
  / skip
  / name
  / list
  / map
  / function
  / case
  / scope
  / subExpression

unary = operator:operator _ operand:atom {
  return {
    type: "call",
    callee: operator,
    args: [operand],
    location: location()
  };
}

callee = unary / atom

call =
  callee:callee _
  "(" _
  args:(first:expression rest:(_ "," _ arg:expression { return arg; })* { return [first].concat(rest); })?
  _ ")" {
  return {
    type: "call",
    callee: callee,
    args: args || [],
    location: location()
  };
}

binaryOperand = call / callee

binary =
  first:binaryOperand
  rest:(_ operator:operator _ right:binaryOperand { return { operator, right }; })+ {
  return rest.reduce(
    (left, { operator, right }) => ({
      type: "call",
      callee: operator,
      args: [left, right],
      location: location()
    }),
    first);
  }

expression = binary / binaryOperand / operator
