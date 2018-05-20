{
  function groupDefinitions(definitions) {
    let groupedDefinitions = [];
    let functions = {};
    for(let definition of definitions) {
      const { type, args, body, location } = definition;
      if (type === "function") {
        const id = definition.name.name;
        if (!functions[id]) {
          definition = {
            type: type,
            name: definition.name,
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

_ "whitespace" = [ \t\n\r]*

reservedWord "special word" =
  wordCase
  / wordWhen
  / wordElse
  / wordDo
  / wordWhere
  / wordLet
  / wordEnd
  / wordModule
  / wordImport
  / wordExport

wordCase "case" = "case" !beginNameChar
wordWhen "when" = "when" !beginNameChar
wordElse "else" = "else" !beginNameChar
wordDo "do" = "do" !beginNameChar
wordWhere "where" = "where" !beginNameChar
wordLet "let" = "let" !beginNameChar
wordEnd "end" = "end" !beginNameChar
wordModule "module" = "module" !beginNameChar
wordImport "import" = "import" !beginNameChar
wordExport "export" = "export" !beginNameChar

beginNameChar = [a-z_]
nameChar = [0-9a-zA-Z_]
name "function name" =
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

beginModuleNameChar = [a-zA-Z_]
moduleNameChar = [0-9a-zA-Z_\.\/\-]
moduleName "module name" =
  !reservedWord
  first:beginModuleNameChar
  rest:(moduleNameChar+)?
  {
    return {
      type: "name",
      name: [first].concat(rest || []).join(""),
      location: location()
    };
  }

reservedOperator = ("=" / "->") !operatorChar
operatorChar = [\+\-\*\/\>\<\=\%\!\|\&|\^|\~]
operator "operator" =
  !reservedOperator
  chars:operatorChar+ {
  return {
    type: "name",
    name: chars.join(""),
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

key "key" = key:(name / operator) ":" {
  return {
    type: "key",
    value: key.name,
    location: location()
  };
}

property "property" = "." name:name {
  return name;
}

where = wordWhere _ definitions:definitions _ wordEnd {
  return {
    type: "where",
    definitions: definitions
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

mapKeyValueItem = key:atom _ value:expression {
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

lambda = "\\" _ args:(arg:lvalue _ { return arg; })* _ "->" _ body:expression {
  return {
    type: "lambda",
    args: args,
    body: body,
    location: location()
  };
}

monadItem = via:(via:lvalue _ "=" _ { return via; })? value:expression _ ";" {
  return {
    via: via,
    value: value,
    location: location()
  };
}

monad "monad" =
  wordDo _
  items:(item:monadItem _ { return item; })+
  wordEnd {
    return {
      type: "monad",
      items: items
    };
  }

caseBranch = wordWhen _ condition:expression _ "->" _ value:expression {
  return {
    condition: condition,
    value: value
  };
}

caseOtherwise = wordElse _ value:expression {
  return value;
}

case "case" =
  wordCase _
  branches:(branch:caseBranch _ { return branch; })+
  otherwise:caseOtherwise _
  wordEnd {
    return {
      type: "case",
      branches: branches,
      otherwise: otherwise
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
  / key
  / name
  / list
  / map
  / lambda
  / monad
  / case
  / subExpression

unary = operator:operator _ operand:atom {
  return {
    type: "call",
    callee: operator,
    args:[operand],
    location: location()
  };
}

callee = unary / atom

args = ("(" _ ")" { return []; } / (arg:atom _ { return arg; })+)

call = callee:callee _ args:args {
  return {
    type: "call",
    callee: callee,
    args: args,
    location: location()
  };
}

invoke = method:property _ object:atom _ args:args {
  return {
    type: "invoke",
    object: object,
    method: method,
    args: args,
    location: location()
  };
}

binaryOperand = call / invoke / callee

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

expression = expression:(binary / binaryOperand / operator) _ where:where? {
  if(where) {
    return {
      type: "scope",
      definitions: where.definitions,
      body: expression
    };
  }
  else {
    return expression;
  }
}

mapDestructKeyLValueItem = key:atom _ lvalue:lvalue {
  return {
    key: key,
    lvalue: lvalue
  };
}

mapDestructKeyItem = name:name {
  return {
    key: {
      type: "key",
      name: name.name,
      location: name.location
    },
    lvalue: name
  };
}

mapDestructItem = mapDestructKeyLValueItem / mapDestructKeyItem

mapDestruct = "{" _
  items:(first:mapDestructItem rest:(_ "," _ item:mapDestructItem { return item; })* { return [first].concat(rest); })
  _ "}" {
  return {
    type: "mapDestruct",
    items: items,
    location: location()
  };
}

destruct = mapDestruct

alias = name:name _ "@" _ lvalue:destruct {
  return {
    type: "alias",
    name: name,
    lvalue: lvalue,
    location: location()
  };
}

lvalue = alias / name / destruct

constantDefinition = wordLet _ lvalue:(lvalue / operator) _ "=" _ value:expression {
  return {
    type: "constant",
    lvalue: lvalue,
    value: value,
    location: location()
  };
}

functionDefinition = wordLet _ name:name _ args:(arg:lvalue _ { return arg; })* _ "->" _ body:expression {
  return {
    type: "function",
    name: name,
    args: args,
    body: body,
    location: location()
  };
}

unaryOperatorDefinition = wordLet _ name:operator _ arg:lvalue _ "->" _ body:expression {
  return {
    type: "function",
    name: name,
    args: [arg],
    body: body,
    location: location()
  };
}

binaryOperatorDefinition = wordLet _ left:lvalue _ name:operator _ right:lvalue _ "->" _ body:expression {
  return {
    type: "function",
    name: name,
    args: [left, right],
    body: body,
    location: location()
  };
}

operatorDefinition = unaryOperatorDefinition / binaryOperatorDefinition

definition = constantDefinition / operatorDefinition / functionDefinition

definitions = definitions:(definition:definition _ { return definition; })+ {
  return groupDefinitions(definitions);
}

namesKeyNameItem = key:key _ name:(name / operator) {
  return {
    key: {
      type: "name",
      name: key.value,
      location: key.location
    },
    name: name
  };
}

namesKeyItem = name:(name / operator) {
  return {
    key: name,
    name: name
  };
}

namesItem = namesKeyNameItem / namesKeyItem

names = "{" _
  items:(first:namesItem rest:(_ "," _ item:namesItem { return item; })* { return [first].concat(rest); })
  _ "}" {
  return {
    type: "names",
    items: items
  };
}

import "import" = wordImport _ module:moduleName _ value:(name / names) {
  return {
    type: "import",
    module: module,
    value: value,
    location: location()
  };
}

export "export" = wordExport _ value:(name / names) {
  return {
    type: "export",
    value: value,
    location: location()
  };
}

module "module" =
  wordModule _ name:moduleName _
  imports:(_import:import _ { return _import; })*
  definitions:definitions _
  _export:export {
  return {
    type: "module",
    name: name,
    imports: imports,
    export: _export,
    definitions: definitions,
    location: location()
  };
}
