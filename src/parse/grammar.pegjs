{
  function groupDefinitions(definitions) {
    let groupedDefinitions = [];
    let functions = {};
    let methods = {};
    for(let definition of definitions) {
      const { type, name, record, args, body, location } = definition;
      if (type === "function" ||
          type === "record" ||
          type === "method") {
        const id = `${record || ""}.${name}`;
        if (!functions[id]) {
          definition = {
            type: type,
            name: name,
            record: record,
            variants: [{ args, body, location }],
            location: location
          };
          functions[id] = definition;
          groupedDefinitions.push(definition);
        }
        else {
          functions[id].variants.push({ args, body, location });
        }
      }
      else {
        groupedDefinitions.push(definition);
      }
    }
    return groupedDefinitions;
  }
}

ast = __ ast:(module / expression) __ {
  return ast;
}

_ "whitespace" = [ \t]*
__ "whitespace" = [ \t\n\r]*

beginWordChar = [a-zA-Z_]

reservedWord "reserved word" =
  wordCase
  / wordElse
  / wordLet
  / wordIn
  / wordDo
  / wordEnd
  / wordModule
  / wordImport
  / wordFrom
  / wordExport

wordCase "case" = "case" !beginWordChar
wordElse "else" = "else" !beginWordChar
wordLet "let" = "let" !beginWordChar
wordIn "in" = "in" !beginWordChar
wordDo "do" = "do" !beginWordChar
wordEnd "end" = "end" !beginWordChar
wordModule "module" = "module" !beginWordChar
wordImport "import" = "import" !beginWordChar
wordFrom "from" = "from" !beginWordChar
wordExport "export" = "export" !beginWordChar

beginConstantNameChar = [a-z_]
constantNameChar = [0-9a-zA-Z_]
constantName "constant name" =
  !reservedWord
  first:beginConstantNameChar
  rest:(constantNameChar+)?
  {
    return [first].concat(rest || []).join("");
  }

beginFunctionNameChar = [a-z_]
functionNameChar = [0-9a-zA-Z_]
functionName "function name" =
  !reservedWord
  first:beginFunctionNameChar
  rest:(functionNameChar+)?
  {
    return [first].concat(rest || []).join("");
  }

beginRecordNameChar = [A-Z]
recordNameChar = [0-9a-zA-Z_]
recordName "record name" =
  !reservedWord
  first:beginRecordNameChar
  rest:(recordNameChar+)?
  {
    return [first].concat(rest || []).join("");
  }

beginModuleNameChar = [a-zA-Z_]
moduleNameChar = [0-9a-zA-Z_\.\/\-]
moduleName "module name" =
  !reservedWord
  first:beginModuleNameChar
  rest:(moduleNameChar+)?
  {
    return [first].concat(rest || []).join("");
  }

identifierName = constantName / functionName / recordName

name = identifierName / operatorName

reservedOperator = ("=" / "->" / "<-") !operatorChar

operatorChar = [\+\-\*\/\>\<\=\%\!\|\&|\^|\~]
operatorName "operator name" =
  !reservedOperator
  chars:operatorChar+ {
  return chars.join("");
}

identifier "identifier" = name:identifierName {
  return {
    type: "identifier",
    name: name,
    location: location()
  };
}

operator "operator" = name:operatorName {
  return {
    type: "identifier",
    name: name,
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

noArgs "()" = "(" _ ")" {
  return [];
}

argsList = args:(noArgs / (arg:identifierName _ { return arg; })+) {
  return args;
}

lambda "lambda" = args:argsList __ "->" __ body:expression {
  return {
    type: "lambda",
    args: args,
    body: body,
    location: location()
  };
}

list "list" =
  "[" __
  items:(first:expression rest:(__ "," __ item:expression { return item; })* { return [first].concat(rest); })?
  __ "]" {
    return {
      type: "list",
      items: items || [],
      location: location()
    };
  }

namedKey "named key" = key:name {
  return {
    type: "key",
    value: key,
    location: location()
  };
}

key = namedKey / literal / subExpression

mapItem = key:key __ ":" __ value:expression {
  return {
    key: key,
    value: value,
    location: location()
  };
}

map "map" =
  "{" __
  items:(first:mapItem rest:(__ "," __ item:mapItem { return item; })* { return [first].concat(rest); })?
  __ "}" {
    return {
      type: "map",
      items: items || [],
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
  / list
  / map
  / lambda
  / getter

getter "getter" = keys:keyAccess+ {
  return {
    type: "getter",
    keys: keys,
    location: location()
  };
}

caseBranch = condition:expression __ ":" __ value:expression {
  return {
    condition: condition,
    value: value,
    location: location()
  };
}

case "case" =
  wordCase __
  branches:(first:caseBranch rest:(__ branch:caseBranch { return branch; })* { return [first].concat(rest); })
  __ wordElse __ otherwise:expression {
    return {
      type: "case",
      branches: branches,
      otherwise: otherwise,
      location: location()
    };
  }

scope "scope" = wordLet __ definitions:definitions __ wordIn __ body:expression {
    return {
      type: "scope",
      definitions: definitions,
      body: body,
      location: location()
    };
  }

monadItem = via:(name:constantName __ "<-" __ { return name; })? value:expression {
  return {
    via: via,
    value: value,
    location: location()
  };
}

monad "monad" =
  wordDo __
  items:(first:monadItem rest:(__ item:monadItem { return item; })* { return [first].concat(rest); })
  __ wordEnd {
    return {
      type: "monad",
      items: items,
      location: location()
    };
  }

subExpression "sub-expression" = "(" _ expression:expression _ ")" {
  return expression;
}

atom =
  literal
  / identifier
  / subExpression

get = collection:atom keys:("." key:key { return key; })+ {
  return {
    type: "get",
    collection: collection,
    keys: keys,
    location: location()
  };
}

unaryOperand = get / atom

unary = operator:operator _ operand:unaryOperand {
  return {
    type: "call",
    fun: operator,
    args:[operand],
    location: location()
  };
}

fun = unary / unaryOperand

call = fun:fun _ args:(noArgs / (arg:unaryOperand _ { return arg; })+) {
  return {
    type: "call",
    fun: fun,
    args: args,
    location: location()
  };
}

binaryOperand = call / fun

binary =
  first:binaryOperand
  rest:(_ operator:operator _ right:binaryOperand { return { operator, right }; })+ {
  return rest.reduce(
    (left, { operator, right }) => ({
      type: "call",
      fun: operator,
      args: [left, right],
      location: location()
    }),
    first);
  }

expression = case / scope / monad / binary / binaryOperand / operator

constantDefinition = name:constantName __ "=" __ value:expression {
  return {
    type: "constant",
    name: name,
    value: value,
    location: location()
  };
}

functionDefinition = name:functionName __ args:argsList _ "=" __ body:expression {
  return {
    type: "function",
    name: name,
    args: args,
    body: body,
    location: location()
  };
}

recordDefinition = name:recordName __ args:argsList __ "=" __ body:expression {
  return {
    type: "record",
    name: name,
    args: args,
    body: body,
    location: location()
  };
}

methodDefinition = record:recordName "." name:functionName __ args:argsList __ "=" __ body:expression {
  return {
    type: "method",
    name: name,
    record: record,
    args: args,
    body: body,
    location: location()
  };
}

operatorDefinition = name:operatorName __ "=" __ value:expression {
  return {
    type: "constant",
    name: name,
    value: value,
    location: location()
  };
}

unaryDefinition = name:operatorName __ arg:identifierName __ "=" __ body:expression {
  return {
    type: "function",
    name: name,
    args: [arg],
    body: body,
    location: location()
  };
}

binaryDefinition = a:identifierName __ name:operatorName __ b:identifierName __ "=" __ body:expression {
  return {
    type: "function",
    name: name,
    args: [a, b],
    body: body,
    location: location()
  };
}

definition =
  constantDefinition
  / functionDefinition
  / recordDefinition
  / methodDefinition
  / operatorDefinition
  / unaryDefinition
  / binaryDefinition

definitions = first:definition rest:(__ definition:definition { return definition; })* {
  return groupDefinitions([first].concat(rest));
}

importList =
  "{" __
  names:(first:name rest:(__ "," __ name:name { return name; })* { return [first].concat(rest); })
  __ "}" {
  return names;
}

exportList =
  "{" __
  names:(first:name rest:(__ "," __ name:name { return name; })* { return [first].concat(rest); })
  __ "}" {
  return names;
}

import "import" = wordImport __ alias:name? __ names:importList? __ wordFrom __ module:moduleName {
  return {
    type: "import",
    module: module,
    alias: alias,
    names: names || [],
    location: location()
  };
}

exportName = name:name {
  return {
    type: "export",
    name: name,
    location: location()
  };
}

exportNames = names:exportList {
  return {
    type: "export",
    names: names,
    location: location()
  };
}

export "export" = wordExport __ _export:(exportName / exportNames) {
  return _export;
}

module "module" =
  wordModule __ name:moduleName __
  imports:(first:import rest:(__ _import:import { return _import; })* { return [first].concat(rest); })? __
  definitions:definitions __
  _export:export? {
  return {
    type: "module",
    name: name,
    imports: imports || [],
    definitions: definitions,
    export: _export,
    location: location()
  };
}
