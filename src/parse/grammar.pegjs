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

ast = _ ast:(module / expression) _ {
  return ast;
}

_ "whitespace"
  = [ \t\n\r]*

reservedWord =
  wordCase
  / wordLet
  / wordDo
  / wordModule
  / wordImport
  / wordFrom
  / wordExport

wordCase = "case" !beginNameChar
wordLet = "let" !beginNameChar
wordDo = "do" !beginNameChar
wordModule = "module" !beginNameChar
wordImport = "import" !beginNameChar
wordFrom = "from" !beginNameChar
wordExport = "export" !beginNameChar

beginNameChar = [a-zA-Z_]
nameChar = [0-9a-zA-Z_]
name "name" =
  !reservedWord
  first:beginNameChar
  rest:(nameChar+)?
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
moduleNameChar = [0-9a-zA-Z_\.\/\-\*\+]
moduleName "module name" =
  !reservedWord
  first:beginModuleNameChar
  rest:(moduleNameChar+)?
  {
    return [first].concat(rest || []).join("");
  }

names "names" =
  "{" _
  names:(first:name rest:(_ "," _ name:name { return name; })* { return [first].concat(rest); })
  _ "}" {
  return names;
}

reservedOperator = ("=" / "<-" / "->") !operatorChar

operatorChar = [\+\-\*\/\>\<\=\$\%\!\|\&]
operator "operator" = !reservedOperator chars:operatorChar+ {
  return {
    type: "operator",
    name: chars.join(""),
    location: location()
  };
}

atom =
  access
  / literal
  / identifier
  / getter
  / lambda
  / vector
  / map
  / case
  / let
  / do
  / subExpression

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

literal "literal" =
  undefined
  / null
  / false
  / true
  / number
  / string

identifier "identifier" = name:name {
  return {
    type: "identifier",
    name: name,
    location: location()
  };
}

unary "unary operation" = operator:operator _ operand:(atom / unary) {
  return {
  	type: "call",
    fun: operator,
    args: [operand],
    location: location()
  };
}

call "call" = fun:atom args:(_ arg:atom _ { return arg })+ {
  return {
    type: "call",
    fun: fun,
    args: args,
    location: location()
  };
}

access "access" =
  collection:(literal / identifier / vector / map / subExpression)
  keys:("." key:identifier { return key; })+ {
  return keys.reduce((collection, key) => ({
    type: "access",
    collection: collection,
    key: key,
    location: key.location
  }), collection);
}

term = call / unary / atom

expression "expression" =
  first:term
  rest:(_ operator:operator _ right:term { return { operator, right }; })* {
  return rest.reduce(
    (left, { operator, right }) => ({
      type: "call",
      fun: operator,
      args: [left, right],
      location: location()
    }),
    first);
}

subExpression "sub-expression" = "(" _ expression:expression _ ")" {
  return expression;
}

getter "getter" = keys:("." key:identifier { return key; })+ {
  const arg = {
    type: "identifier",
    name: "coll",
    location: location()
  };
  const body = keys.reduce((collection, key) => ({
    type: "access",
    collection: collection,
    key: key,
    location: key.location
  }), arg);
  return {
    type: "lambda",
    args: ["coll"],
    body: body,
    location: location()
  };
}

argsList = args:(first:name rest:(_ arg:name { return arg; })* { return [first].concat(rest); })? {
  return args || [];
}

lambda "lambda" = "(" _ args:argsList _ "->" _ body:expression _ ")" {
  return {
    type: "lambda",
    args: args,
    body: body,
    location: location()
  };
}

vector "vector" =
  "[" _
  items:(first:expression rest:(_ "," _ item:expression { return item; })* { return [first].concat(rest); })?
  _ "]" {
    return {
      type: "vector",
      items: items || [],
      location: location()
    };
  }

mapItem = key:expression _ ":" _ value:expression {
  return {
    key: key,
    value: value,
    location: location()
  };
}
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

caseBranch = condition:expression _ "->" _ value:expression {
  return {
    condition: condition,
    value: value,
    location: location()
  };
}
case "case" =
  wordCase _
  branches:(first:caseBranch rest:(_ "," _ branch:caseBranch { return branch; })* { return [first].concat(rest); })
  _ "," _
  otherwise:expression {
    return {
      type: "case",
      branches: branches,
      otherwise: otherwise,
      location: location()
    };
  }

constant "constant" = name:name _ "=" _ value:expression {
  return {
    type: "constant",
    name: name,
    value: value,
    location: location()
  };
}

function "function" = name:name _ args:argsList _ "->" _ body:expression {
  return {
    type: "function",
    name: name,
    args: args,
    body: body,
    location: location()
  };
}

record "record" = name:recordName _ args:argsList _ "->" _ body:expression {
  return {
    type: "record",
    name: name,
    args: args,
    body: body,
    location: location()
  };
}

method "method" = record:recordName "." name:name _ args:argsList _ "->" _ body:expression {
  return {
    type: "method",
    name: name,
    record: record,
    args: args,
    body: body,
    location: location()
  };
}

definition "definition" = constant / record / function / method

let "let" =
  wordLet _
  definitions:(first:definition rest:(_ "," _ definition:definition { return definition; })* { return [first].concat(rest); })
  _ "," _ body:expression {
    return {
      type: "let",
      definitions: groupDefinitions(definitions),
      body: body,
      location: location()
    };
  }

doPoint = body:expression {
  return {
    via: "_",
    body: body,
    location: location()
  };
}
doJoin = via:name _ "=" _ body:expression {
  return {
    via: via,
    body: body,
    location: location()
  };
}
doItem = doJoin / doPoint
do "do" =
  wordDo _
  items:(first:doItem rest:(_ "," _ item:doItem { return item; })* { return [first].concat(rest); }) {
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

import "import" = wordImport _ alias:name? _ names:names? _ wordFrom _ module:moduleName {
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
exportNames = names:names {
  return {
    type: "export",
    names: names,
    location: location()
  };
}
export "export" = wordExport _ _export:(exportName / exportNames) {
  return _export;
}
moduleDefinition "module level definition" = wordLet _ definition:definition {
  return definition;
}
module "module" =
  wordModule _ name:moduleName _
  imports:(first:import rest:(_ _import:import { return _import; })* { return [first].concat(rest); })? _
  definitions:(first:moduleDefinition rest:(_ definition:moduleDefinition { return definition; })* { return [first].concat(rest); }) _
  _export:export? {
  return {
    type: "module",
    name: name,
    imports: imports || [],
    definitions: groupDefinitions(definitions),
    export: _export,
    location: location()
  };
}
