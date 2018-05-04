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

wordCase = "case" !beginIdentifierChar
wordLet = "let" !beginIdentifierChar
wordDo = "do" !beginIdentifierChar
wordModule = "module" !beginIdentifierChar
wordImport = "import" !beginIdentifierChar
wordFrom = "from" !beginIdentifierChar
wordExport = "export" !beginIdentifierChar

name "name" = name:(identifier / operator) {
  return name.name;
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

names "names" =
  "{" _
  names:(first:name rest:(_ "," _ name:name { return name; })* { return [first].concat(rest); })
  _ "}" {
  return names;
}

reservedOperator = ("=" / "->") !operatorChar

operatorChar = [\+\-\*\/\>\<\=\%\!\|\&|\^|\~\?]
operator "operator" = !reservedOperator chars:operatorChar+ {
  return {
    type: "identifier",
    name: chars.join(""),
    location: location()
  };
}

beginIdentifierChar = [a-zA-Z_]
identifierChar = [0-9a-zA-Z_]
identifier "identifier" =
  !reservedWord
  first:beginIdentifierChar
  rest:(identifierChar+)? {
  return {
      type: "identifier",
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

argName = name:identifier {
  return name.name;
}

argsList = args:(first:argName rest:(_ arg:argName { return arg; })* { return [first].concat(rest); })? {
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

list "list" =
  "[" _
  items:(first:expression rest:(_ "," _ item:expression { return item; })* { return [first].concat(rest); })?
  _ "]" {
    return {
      type: "list",
      items: items || [],
      location: location()
    };
  }

namedKey = key:name {
  return {
    type: "key",
    value: key,
    location: location()
  };
}

key = namedKey / literal / subExpression

mapItem = key:key _ ":" _ value:expression {
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

getter "getter" = keys:("." key:key { return key; })+ {
  return {
    type: "getter",
    keys: keys,
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

subExpression "sub-expression" = "(" _ expression:expression _ ")" {
  return expression;
}

atom =
  literal
  / getter
  / identifier
  / case
  / let
  / do
  / subExpression

get "get" =
  collection:atom
  keys:("." key:key { return key; })+ {
  return {
    type: "get",
    collection: collection,
    keys: keys,
    location: location()
  };
}

term = get / atom

call "call" = fun:(term / operator) args:(_ arg:term _ { return arg; })+ {
  return {
    type: "call",
    fun: fun,
    args: args,
    location: location()
  };
}

operand = call / term / operator

expression "expression" =
  first:operand
  rest:(_ operator:operator _ right:operand { return { operator, right }; })* {
  return rest.reduce(
    (left, { operator, right }) => ({
      type: "call",
      fun: operator,
      args: [left, right],
      location: location()
    }),
    first);
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
