{
  function groupDefinitions(definitions) {
    let groupedDefinitions = [];
    let functions = {};
    for(let definition of definitions) {
      const { type, args, body, spec, location } = definition;
      if (type === "function") {
        const id = definition.name.name;
        if (!functions[id]) {
          definition = {
            type: type,
            name: definition.name,
            variants: [{ args, body, spec, location }],
            location: location
          };
          functions[id] = definition;
          groupedDefinitions.push(definition);
        }
        else {
          functions[id].variants.push({ args, body, spec, location });
        }
      }
      else {
        groupedDefinitions.push(definition);
      }
    }
    return groupedDefinitions;
  }

  function withWhere(expression, where) {
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
}

ast = _ ast:(module / expression) _ {
  return ast;
}

_ "whitespace" = ([ \t\n\r] / comment)*
__ "whitespace" = ([ \t] / escapedNL)*

nl = [\n\r] / [\n]
escapedNL = "\\" nl
oneLineComment = "#" (!nl .)*
multilineComment = "#" "{" (multilineComment / (!"}" .))* "}"
comment = multilineComment / oneLineComment

reservedWord "special word" =
  wordCase
  / wordDo
  / wordWhere
  / wordEnd
  / wordModule
  / wordImport
  / wordExport

wordCase "case" = "case" !beginNameChar
wordDo "do" = "do" !beginNameChar
wordWhere "where" = "where" !beginNameChar
wordEnd "end" = "end" !beginNameChar
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

moduleNameChar = [0-9a-zA-Z_\.\/\-]
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

reservedOperator = ("=" / "->" / "<-") !operatorChar
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

undefined "undefined" = "undefined" !beginNameChar {
  return {
    type: "literal",
    value: undefined,
    location: location()
  };
}

null "null" = "null" !beginNameChar {
  return {
    type: "literal",
    value: null,
    location: location()
  };
}

false "false" = "false" !beginNameChar {
  return {
    type: "literal",
    value: false,
    location: location()
  };
}

true "true" = "true" !beginNameChar {
  return {
    type: "literal",
    value: true,
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
    type: "literal",
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
    type: "literal",
    value: chars.join(""),
    location: location()
  };
}

key "key" = ":" name:name {
  return {
    type: "key",
    value: name.name,
    location: location()
  };
}

literal =
  undefined
  / null
  / false
  / true
  / number
  / string

skip "_" = "_" !beginNameChar {
  return {
    type: "skip",
    location: location()
  };
}

noArgs = "(" ")" {
  return [];
}

property "property" = "." name:name {
  return {
    type: "property",
    name: name.name,
    location: location()
  };
}

goodEnd = wordEnd {
  return null;
}

badEnd = . {
  error("Expected end", location());
}

end = goodEnd / badEnd

goodWhere = definitions:definitions _ end {
  return {
    type: "where",
    definitions: definitions
  };
}

badWhere = . {
  error("Expected where", location());
}

where = wordWhere _ where:(goodWhere / badWhere) {
  return where;
}

whereOrEnd =  where / end

rest = "..." _ name:name {
  return name;
}

list "list" =
  "[" _
  items:(first:expression rest:(_ "," _ item:expression { return item; })* { return [first].concat(rest); })? _
  rest:("," _ rest:rest { return rest; })?
  _ "]" {
    return {
      type: "list",
      items: items || [],
      rest: rest,
      location: location()
    };
  }

mapKeyValueItem = key:expression _ "->" _ value:expression {
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
  items:(first:mapItem rest:(_ "," _ item:mapItem { return item; })* { return [first].concat(rest); })? _
  rest:("," _ rest:rest { return rest; })?
  _ "}" {
    return {
      type: "map",
      items: items || [],
      rest: rest,
      location: location()
    };
  }

lambda = "\\" _ args:(noArgs / (arg:lvalue _ { return arg; })+) _ "->" _ body:expression {
  return {
    type: "lambda",
    args: args,
    body: body,
    location: location()
  };
}

monadItem = via:(via:lvalue _ "<-" _ { return via; })? value:expression {
  return {
    via: via,
    value: value,
    location: location()
  };
}

goodMonad =
  items:(item:monadItem _ { return item; })+
  where:(where / wordEnd { return null; }) {
    return withWhere({
      type: "monad",
      items: items
    }, where);
  }

badMonad = . {
  error("Expected monad", location());
}

monad "monad" = wordDo _ monad:(goodMonad / badMonad) {
  return monad;
}

caseBranch = condition:expression _ "->" _ value:expression {
  return {
    condition: condition,
    value: value
  };
}

caseOtherwise = "->" _ otherwise:expression {
  return otherwise;
}

goodCase =
  branches:(branch:caseBranch _ { return branch; })+
  otherwise:caseOtherwise _
  where:whereOrEnd {
    return withWhere({
      type: "case",
      branches: branches,
      otherwise: otherwise
    }, where);
  }

badCase = . {
  error("Expected case", location());
}

case "case" = wordCase _ _case:(goodCase / badCase) {
  return _case;
}

subExpression "sub-expression" = "(" _ expression:expression _ ")" {
  return expression;
}

atom =
  literal
  / skip
  / key
  / name
  / list
  / map
  / lambda
  / monad
  / case
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

call = callee:callee __ args:(noArgs / (arg:atom __ { return arg; })+) {
  return {
    type: "call",
    callee: callee,
    args: args,
    location: location()
  };
}

invoke = method:property __ object:atom __ args:(arg:atom __ { return arg; })* {
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
  rest:(__ operator:operator __ right:binaryOperand { return { operator, right }; })+ {
  return rest.reduce(
    (left, { operator, right }) => ({
      type: "call",
      callee: operator,
      args: [left, right],
      location: location()
    }),
    first);
  }

expression = expression:(binary / binaryOperand / operator) __ where:where? {
  return withWhere(expression, where);
}

badExpression = . {
  error("Expected expression", location());
}

ensureExpression = expression / badExpression

listDestruct =
  "[" _
  items:(first:lvalue rest:(_ "," _ item:lvalue { return item; })* { return [first].concat(rest); }) _
  rest:("," _ rest:rest { return rest; })?
  _ "]" {
  return {
    type: "listDestruct",
    items: items,
    rest: rest,
    location: location()
  };
}

mapDestructKeyLValueItem = key:(expression / property) _ "->" _ lvalue:lvalue {
  return {
    key: key,
    lvalue: lvalue
  };
}

mapDestructPropertyItem = property:property {
  return {
    key: property,
    lvalue: {
      type: "name",
      name: property.name,
      location: property.location
    }
  };
}

mapDestructKeyItem = name:name {
  return {
    key: {
      type: "key",
      value: name.name,
      location: name.location
    },
    lvalue: name
  };
}

mapDestructItem = mapDestructKeyLValueItem / mapDestructPropertyItem / mapDestructKeyItem

mapDestruct =
  "{" _
  items:(first:mapDestructItem rest:(_ "," _ item:mapDestructItem { return item; })* { return [first].concat(rest); }) _
  rest:("," _ rest:rest { return rest; })?
  _ "}" {
  return {
    type: "mapDestruct",
    items: items,
    rest: rest,
    location: location()
  };
}

recordDestruct = "TODO"

destruct = listDestruct / mapDestruct / recordDestruct

alias = name:name _ "@" _ lvalue:lvalue {
  return {
    type: "alias",
    name: name,
    lvalue: lvalue,
    location: location()
  };
}

lvalue = skip / alias / name / destruct

spec = expression

valueSpec = value:ensureExpression {
  return {
    type: "valueSpec",
    value: value,
    location: location()
  };
}

functionSpec = args:(noArgs / (arg:atom _ { return arg; })+) _ "->" _ res:ensureExpression {
  return {
    type: "functionSpec",
    args: args,
    res: res,
    location: location()
  };
}

constantDefinition =
  lvalue:(lvalue / operator)
  _ "=" _
  value:ensureExpression _
  spec:("::" _ spec:valueSpec { return spec; })? {
  return {
    type: "constant",
    lvalue: lvalue,
    value: value,
    spec: spec,
    location: location()
  };
}

recordDefinition = name:recordName _ args:(arg:name __ { return arg; })* {
  return {
    type: "record",
    name: name,
    args: args,
    location: location()
  };
}

functionDefinition =
  name:name _
  args:(noArgs / (arg:lvalue _ { return arg; })+)
  _ "=" _
  body:ensureExpression _
  spec:("::" _ spec:functionSpec { return spec; })? {
  return {
    type: "function",
    name: name,
    args: args,
    body: body,
    spec: spec,
    location: location()
  };
}

unaryOperatorDefinition =
  name:operator _ arg:lvalue _
  "=" _
  body:ensureExpression _
  spec:("::" _ spec:functionSpec { return spec; })? {
  return {
    type: "function",
    name: name,
    args: [arg],
    body: body,
    spec: spec,
    location: location()
  };
}

binaryOperatorDefinition =
  left:lvalue _ name:operator _ right:lvalue
  _ "=" _
  body:ensureExpression _
  spec:("::" _ spec:functionSpec { return spec; })? {
  return {
    type: "function",
    name: name,
    args: [left, right],
    body: body,
    spec: spec,
    location: location()
  };
}

operatorDefinition = unaryOperatorDefinition / binaryOperatorDefinition

definition = constantDefinition / operatorDefinition / recordDefinition / functionDefinition

definitions = definitions:(definition:definition _ { return definition; })+ {
  return groupDefinitions(definitions);
}

symbol = name:(name / operator) {
  return {
    type: "symbol",
    name: name.name,
    location: name.location
  };
}

symbolsKeyNameItem = key:symbol _ "->" _ name:symbol {
  return {
    key: key,
    name: name
  };
}

symbolsKeyItem = name:symbol {
  return {
    key: name,
    name: name
  };
}

symbolsItem = symbolsKeyNameItem / symbolsKeyItem

symbols = "{" _
  items:(first:symbolsItem rest:(_ "," _ item:symbolsItem { return item; })* { return [first].concat(rest); })
  _ "}" {
  return {
    type: "symbols",
    items: items
  };
}

importFromNowhere "import" = value:symbols {
  return {
    type: "import",
    value: value,
    location: location()
  };
}

importFromSomewhere "import" = module:moduleName _ value:(symbol / symbols) {
  return {
    type: "import",
    module: module,
    value: value,
    location: location()
  };
}

goodImport = importFromSomewhere / importFromNowhere

badImport = . {
  error("Expected import", location());
}

import = wordImport _ _import:(goodImport / badImport) {
  return _import;
}

goodExport = value:(symbol / symbols) {
  return {
    type: "export",
    value: value,
    location: location()
  };
}

badExport = . {
  error("Expected export", location());
}

export "export" = wordExport _ _export:(goodExport / badExport) {
  return _export;
}

goodModule =
  name:moduleName _
  imports:(_import:import _ { return _import; })*
  definitions:definitions? _
  _export:export? {
  return {
    type: "module",
    name: name,
    imports: imports,
    export: _export,
    definitions: definitions || [],
    location: location()
  };
}

badModule = . {
  error("Expected module", location());
}

module "module" = wordModule _ module:(goodModule / badModule) {
  return module;
}
