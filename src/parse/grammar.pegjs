ast = _ statement:statement _ {
  return statement;
}

nl = [\n\r] / [\n]

_ "whitespace" = ([ \t\n\r] / comment)*
__ "whitespace" = ([ \t] / comment)*

oneLineComment = "#" (!nl .)*
multilineComment = "#{" (multilineComment / (!"}#" .))* "}#"
comment = multilineComment / oneLineComment

reservedWord "special word" =
  wordWildcard
  / wordCase
  / wordWhen
  / wordElse
  / wordMatch
  / wordDo
  / wordLet
  / wordFn
  / wordIn
  / wordEnd

wordCase "case" = "case" ![a-zA-Z_]
wordWhen "when" = "when" ![a-zA-Z_]
wordElse "else" = "else" ![a-zA-Z_]
wordMatch "match" = "match" ![a-zA-Z_]
wordDo "do" = "do" ![a-zA-Z_]
wordLet "let" = "let" ![a-zA-Z_]
wordFn "fn" = "fn" ![a-zA-Z_]
wordIn "in" = "in" ![a-zA-Z_]
wordEnd "end" = "end" ![a-zA-Z_]

beginNameChar = [a-z_]
nameChar = [a-zA-Z_0-9]
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

reservedOperator = ("=" / "->") !operatorChar
operatorChar = [\+\-\*\/\>\<\=\%\!\|\&|\^|\~\?]
operator "operator" =
  !reservedOperator
  chars:operatorChar+ {
  return {
    type: "name",
    name: chars.join(""),
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

beginSymbolChar = [A-Z]
symbolChar = [a-zA-Z_0-9]
symbol "symbol" =
  !reservedWord
  first:beginSymbolChar
  rest:(symbolChar+)?
  {
    return {
      type: "symbol",
      name: [first].concat(rest || []).join(""),
      location: location()
    };
  }

tupleItem = expression

tuple "tuple" =
  "[" _
  items:(first:tupleItem rest:(_ "," _ item:tupleItem { return item; })* { return [first].concat(rest); })?
  _ "]" {
    return {
      type: "tuple",
      items: items || [],
      location: location()
    };
  }

recordItem = key:name _ ":" _ value:expression {
  return {
    key,
    value
  };
}

record "record" =
  "{" _
  items:(first:recordItem rest:(_ "," _ item:recordItem { return item; })* { return [first].concat(rest); })?
  _ "}" {
    return {
      type: "record",
      items: items || [],
      location: location()
    };
  }

forall =
  "[" _
  types:(first:name rest:(_ "," _ type:name { return type; })* { return [first].concat(rest); })? _
  _ "]" {
  return types || [];
}

params =
  "(" _
  params:(first:name rest:(_ "," _ param:name { return param; })* { return [first].concat(rest); })? _
  _ ")" {
  return params || [];
}

function = wordFn _ forall:forall? _ params:params _ "->" _ body:expression {
  return {
    type: "function",
    forall: forall || [],
    params,
    body,
    location: location()
  };
}

caseBranch = wordWhen _ condition:expression _ ":" _ value:expression {
  return {
    condition,
    value
  };
}

caseOtherwise = wordElse _ otherwise:expression {
  return otherwise;
}

case "case" =
  wordCase _
  branches:(branch:caseBranch _ { return branch; })+
  otherwise:caseOtherwise {
  return {
    type: "case",
    branches,
    otherwise,
    location: location()
  };
}

matchBranch =
  wordWhen _
  patterns:(first:expression rest:(_ "," _ pattern:expression { return pattern; })* { return [first].concat(rest); })
  _ ":" _
  value:expression {
  return {
    patterns,
    value
  };
}

matchOtherwise = wordElse _ otherwise:expression {
  return otherwise;
}

match "match" =
  wordMatch _
  names:(first:name rest:(_ "," _ name:name { return name; })* { return [first].concat(rest); }) _
  branches:(branch:matchBranch _ { return branch; })+
  otherwise:matchOtherwise {
  for (let { patterns, location } of branches) {
    if (patterns.length !== names.length) {
      error("Wrong amount of patterns", patterns[0].location);
    }
  }
  return {
    type: "match",
    names,
    branches,
    otherwise,
    location: location()
  };
}

constantDefinition = name:name _ "=" _ value:expression {
  return {
    type: "definition",
    kind: "constant",
    name,
    value,
    location: location()
  };
}

functionDefinition = name:name _ forall:forall? _ params:params _ "=" _ body:expression {
  return {
    type: "definition",
    kind: "function",
    name,
    forall,
    params,
    body,
    location: location()
  };
}

definition = constantDefinition / functionDefinition

scope "let" =
  wordLet _
  definitions:(definition:definition _ { return definition; })+ _
  wordIn _
  body:expression {
  return {
    type: "scope",
    definitions,
    body,
    location: location()
  };
}

subExpression "sub-expression" = "(" _ expression:expression _ ")" {
  return expression;
}

atom =
  number
  / string
  / symbol
  / name
  / tuple
  / record
  / function
  / case
  / match
  / scope
  / subExpression

unary = operator:operator __ operand:atom {
  return {
    type: "call",
    callee: operator,
    args: [operand],
    location: location()
  };
}

callee = unary / atom

callArgs = "(" _
  args:(first:expression rest:(_ "," _ arg:expression { return arg; })* { return [first].concat(rest); })?
_ ")" {
  return args || [];
}

call = callee:callee __ chain:(args:callArgs __ { return args; })+ {
  return chain.reduce((callee, args) => ({
    type: "call",
    callee,
    args,
    location: callee.location
  }), callee);
}

binaryOperand = call / callee

binary =
  first:binaryOperand
  rest:(__ operator:operator _ right:binaryOperand { return { operator, right }; })+ {
  return rest.reduce(
    (left, { operator, right }) => ({
      type: "call",
      callee: operator,
      args: [left, right],
      location: operator.location
    }),
    first);
  }

expression = binary / binaryOperand / operator

statement = definition / expression
