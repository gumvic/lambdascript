lambdaScript = module

_ "whitespace"
  = [ \t\n\r]*

leftParen "(" = _ "(" _
rightParen ")" = _ ")" _
leftSquareBracket "[" = _ "[" _
rightSquareBracket "]" = _ "]" _
leftCurlyBracket "{" = _ "{" _
rightCurlyBracket "}" = _ "}" _

arrow = _ "->" _
antiArrow = _ "<-" _

reservedWord =
  _
  reservedWord:(
  	wordCase
  	/ wordElse
  	/ wordLet
  	/ wordIn
  	/ wordModule
  	/ wordImport
  	/ wordFrom
  	/ wordExport)
  _
  {
    return reservedWord;
  }

wordCase = "case" !beginIdentifierChar
wordElse = "else" !beginIdentifierChar
wordLet = "let" !beginIdentifierChar
wordIn = "in" !beginIdentifierChar
wordModule = "module" !beginIdentifierChar
wordImport = "import" !beginIdentifierChar
wordFrom = "from" !beginIdentifierChar
wordExport = "export" !beginIdentifierChar

beginIdentifierChar = [a-zA-Z_]
identifierChar = [0-9a-zA-Z_]
identifier "identifier" =
  !reservedWord
  first:beginIdentifierChar
  rest:(identifierChar+)?
  {
    return {
      type: "identifier",
      name: [first].concat(rest || []).join(""),
      location: location()
    };
  }

operatorChar = [\+\-\*\/\>\<\=\$\%\!\|\&]
operator "operator" = chars:operatorChar+ {
  return {
    type: "operator",
    name: chars.join(""),
    location: location()
  };
}

term =
  _
  term:(
  	lambda
    / literal
  	/ identifier
  	/ operator
  	/ vector
  	/ map
  	/ monad
  	/ case
  	/ block
  	/ call)
   _
  {
    return term;
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
literal "literal" =
  undefined
  / null
  / false
  / true
  / number
  / string

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
    value: parseFloat(text()),
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

name = _ name:identifier _ {
  return name.name;
}

moduleName = _ name:string _ {
  return name.value;
}

vector "vector" = leftSquareBracket items:term* rightSquareBracket {
  return {
    type: "vector",
    items: items || [],
    location: location()
  };
}

mapItem = key:term value:term {
  return {
  	key: key,
    value: value
  };
}
map "map" = leftCurlyBracket items:mapItem* rightCurlyBracket {
  return {
    type: "map",
    items: items || [],
    location: location()
  };
}

lambdaSingleArg = name:name {
  return [name];
}
lambdaMultipleArgs = leftParen args:name* rightParen {
  return args || [];
}
lambdaArgs = lambdaSingleArg / lambdaMultipleArgs
lambda "lambda" = args:lambdaArgs arrow body:term {
  return {
    type: "lambda",
    args: args,
    body: body,
    location: location()
  };
}

caseBranch = condition:term _ value:term {
  return {
    condition: condition,
    value: value
  };
}
case "case" = wordCase branches:caseBranch* wordElse otherwise:term {
  return {
    type: "case",
    branches: branches,
    otherwise: otherwise,
    location: location()
  };
}

point "point" = body:term {
  return {
    via: "_",
    body: body,
    location: location()
  };
}
join "join" = via:identifier _ "=" _ body:term {
  return {
    via: via.name,
    body: body,
    location: location()
  };
}
monadItem = join / point
monadItems =
  first:monadItem
  rest:(_ ";" _ step:monadItem { return step; })* _ ";" {
    return [first].concat(rest);
  }
monad "monad" = "{" _ items:monadItems _ "}" {
  function f(items) {
    if (!items.length) {
      return null;
    }
    var item = items[0];
    var right = f(items.slice(1));
    if (!right) {
      return item.body;
    }
    else {
      return {
        type: "join",
        via: item.via,
        left: item.body,
        right: right,
        location: item.location
      };
    }
  }
  return f(items);
}

block "let" = wordLet definitions:definition+ wordIn body:term {
  return {
    type: "block",
    definitions: definitions,
    body: body,
    location: location()
  };
}

definition = name:name value:term {
  return {
    name: name,
    value: value
  };
}

call "call" = leftParen fun:term args:term* rightParen {
  return {
    type: "call",
    fun: fun,
    args: args || []
  };
}

importGlobals "globals" = leftParen names:name+ rightParen {
  return names;
}
import "import" = wordImport alias:name globals:importGlobals? wordFrom module:moduleName {
  return {
    type: "import",
    module: module,
    alias: alias,
    globals: globals || [],
    location: location()
  };
}
export "export" = wordExport value:term {
  return value;
}
module "module" = imports:import* definitions:definition+ _export:export? {
  return {
    type: "module",
    imports: imports || [],
    definitions: definitions,
    export: _export,
    location: location()
  };
}
