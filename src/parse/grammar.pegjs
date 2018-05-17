{
  let INDENT_STEP = 2;

  let indentLevel = 0;

  function groupDefinitions(definitions) {
    let groupedDefinitions = [];
    let functions = {};
    let methods = {};
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

  function withWhere(body, where) {
    if(where) {
      return {
        type: "scope",
        definitions: where,
        body: body
      };
    }
    else {
      return body;
    }
  }
}

ast = __ ast:(expression / module) __ {
  return ast;
}

_ "whitespace" = [ \t]*
__ = (_ nl)*
samedent "correct indentation" = spaces:" "* &{ return spaces.length === indentLevel * INDENT_STEP; }
indent = &{ indentLevel++; return true; }
dedent = &{ indentLevel--; return true; }
nl = "\n\r" / "\n"
eof = !.
end = nl / eof

reservedWord "special word" =
  wordCase
  / wordDo
  / wordWhere
  / wordModule
  / wordImport
  / wordExport

wordCase "case" = "case" !beginNameChar
wordDo "do" = "do" !beginNameChar
wordWhere "where" = "where" !beginNameChar
wordModule "module" = "module" !beginNameChar
wordImport "import" = "import" !beginNameChar
wordExport "export" = "export" !beginNameChar

beginNameChar = [a-z_]
nameChar = [0-9a-zA-Z_]
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

reservedOperator = ("=" / "->" / "<-") !operatorChar
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

key "key" = key:name ":" {
  return {
    type: "key",
    value: key.name
  };
}

noArgs "()" = "(" _ ")" {
  return [];
}

argsList = args:(noArgs / (arg:lvalue _ { return arg; })+) {
  return args;
}

singlelineList = "[" _
items:(first:expression rest:("," _ item:expression { return item; })* { return [first].concat(rest); })?
_ "]" {
  return {
    type: "list",
    items: items || [],
    location: location()
  };
}

multilineList = "[" _ nl indent
  items:(samedent item:expression "," __ { return item; })*
  last:(samedent item:expression nl { return item; })?
dedent _ "]" {
  return {
    type: "list",
    items: last ? items.concat(last) : items,
    location: location()
  };
}

list "list" = singlelineList / multilineList

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

singlelineMap = "{" _
items:(first:mapItem rest:("," _ item:mapItem { return item; })* { return [first].concat(rest); })?
_ "}" {
  return {
    type: "map",
    items: items || [],
    location: location()
  };
}

multilineMap = "{" _ nl indent
  items:(samedent item:mapItem "," __ { return item; })*
  last:(samedent item:mapItem nl { return item; })?
dedent _ "}" {
  return {
    type: "map",
    items: last ? items.concat(last) : items,
    location: location()
  };
}

map "map" = singlelineMap / multilineMap

lambda = "\\" _ args:argsList _ "->" _ body:expression {
  return {
    type: "lambda",
    args: args,
    body: body,
    location: location()
  };
}

where = wordWhere _ nl indent
  __
  definitions:(samedent definition:definition end? __ { return definition; })+
  dedent {
  return groupDefinitions(definitions);
}

monadItem = via:(via:lvalue _ "<-" _ { return via; })? value:expression {
  return {
    via: via,
    value: value,
    location: location()
  };
}

monad "monad" = wordDo _ nl indent
  __
  items:(samedent item:monadItem end? __ { return item; })+
  __
  where:(samedent where:where { return where; })?
  dedent {
  return withWhere({
    type: "monad",
    items: items
  }, where);
}

caseBranch = condition:expression _ "->" _ value:expression {
  return {
    condition: condition,
    value: value
  };
}

caseOtherwise = "->" _ value:expression {
  return value;
}

case "case" = wordCase _ nl indent
  __
  branches:(samedent branch:caseBranch end? __ { return branch; })+
  __
  otherwise:(samedent otherwise:caseOtherwise end? __ { return otherwise; })
  __
  where:(samedent where:where { return where; })?
  dedent {
  return withWhere({
    type: "case",
    branches: branches,
    otherwise: otherwise
  }, where);
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
  / list
  / map
  / lambda
  / name
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

inlinedArgs = (arg:atom _ { return arg; })+

args = noArgs / inlinedArgs

call = callee:callee _ args:args {
  return {
    type: "call",
    callee: callee,
    args: args,
    location: location()
  };
}

method = "." name:name {
  return name;
}

invoke = method:method _ object:atom _ args:args? {
  return {
    type: "invoke",
    object: object,
    method: method,
    args: args || [],
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
  return withWhere(expression, where);
} / monad / case

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
    items: items
  };
}

destruct = mapDestruct

alias = name:name _ "@" _ lvalue:destruct {
  return {
    type: "alias",
    name: name,
    lvalue: lvalue
  };
}

lvalue = alias / name / destruct

definitionExpression =
  (nl indent samedent expression:expression dedent { return expression; })
  / expression

constantDefinition = lvalue:(lvalue / operator) _ "=" _ value:definitionExpression {
  return {
    type: "constant",
    lvalue: lvalue,
    value: value,
    location: location()
  };
}

functionDefinition = name:name _ args:argsList _ "=" _ body:definitionExpression {
  return {
    type: "function",
    name: name,
    args: args,
    body: body,
    location: location()
  };
}

unaryOperatorDefinition = name:operator _ arg:lvalue _ "=" _ body:definitionExpression {
  return {
    type: "function",
    name: name,
    args: [arg],
    body: body,
    location: location()
  };
}

binaryOperatorDefinition = left:lvalue _ name:operator _ right:lvalue _ "=" _ body:definitionExpression {
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

module "module" =
  wordModule _ name:moduleName _ nl
  __
  definitions:(samedent definition:definition end? __ { return definition; })+ {
  return {
    type: "module",
    name: name,
    imports: [],
    export: { names: [] },
    definitions: groupDefinitions(definitions)
  };
}
