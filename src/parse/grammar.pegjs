{
  function groupDefinitions(definitions) {
    let groupedDefinitions = [];
    let functions = {};
    for(let definition of definitions) {
      const { type, name, args, restArgs, body, location } = definition;
      if (type === "function") {
        const id = name.name;
        if (!functions[id]) {
          definition = {
            type: type,
            name: name,
            variants: [{ args, restArgs, body, location }],
            location: location
          };
          functions[id] = definition;
          groupedDefinitions.push(definition);
        }
        else {
          functions[id].variants.push({ args, restArgs, body, location });
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

_ "whitespace" = ([ \t\n\r] / comment)*

nl = [\n\r] / [\n]

oneLineComment = "#" (!nl .)*
multilineComment = "#{" (multilineComment / (!"}#" .))* "}#"
comment = multilineComment / oneLineComment

reservedWord "special word" =
  wordFn
  / wordWhen
  / wordElse
  / wordDo
  / wordReturn
  / wordLet
  / wordIn
  / wordModule
  / wordImport
  / wordExport

wordFn "fn" = "fn" !beginNameChar
wordWhen "when" = "when" !beginNameChar
wordElse "else" = "else" !beginNameChar
wordDo "do" = "do" !beginNameChar
wordReturn "return" = "return" !beginNameChar
wordLet "let" = "let" !beginNameChar
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

lvalueRest "rest" = "..." lvalue:lvalue {
  return lvalue;
}

lvalueSkip = skip {
  return {
    type: "lvalue.skip",
    location: skip.location
  };
}

lvalueName = name:name {
  return {
    type: "lvalue.name",
    name: name.name,
    location: name.location
  };
}

lvalueList =
  "[" _
  items:(first:lvalue rest:(_ "," _ item:lvalue { return item; })* { return [first].concat(rest); }) _
  restItems:("," _ restItems:lvalueRest { return restItems; })?
  _ "]" {
  return {
    type: "lvalue.list",
    items: items,
    restItems: restItems,
    location: location()
  };
}

lvalueMapKeyLValueItem = key:expression _ ":" _ lvalue:lvalue {
  return {
    key: key,
    lvalue: lvalue
  };
}

lvalueMapKeyItem = key:name {
  return {
    key: {
      type: "string",
      value: key.name,
      location: key.location
    },
    lvalue: {
      type: "lvalue.name",
      value: key.name,
      location: key.location
    }
  };
}

lvalueMapItem = lvalueMapKeyLValueItem / lvalueMapKeyItem

lvalueMap =
  "{" _
  items:(first:lvalueMapItem rest:(_ "," _ item:lvalueMapItem { return item; })* { return [first].concat(rest); }) _
  restItems:("," _ restItems:lvalueRest { return restItems; })?
  _ "}" {
  return {
    type: "lvalue.map",
    items: items,
    restItems: restItems,
    location: location()
  };
}

lvalueAlias = name:name "@" lvalue:lvalue {
  return {
    type: "lvalue.alias",
    name: name,
    lvalue: lvalue,
    location: location()
  };
}

lvalue = lvalueSkip / lvalueAlias / lvalueName / lvalueList / lvalueMap

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

spread = "..." value:expression {
  return value;
}

argsList =
  "(" _
  args:(first:lvalue rest:(_ "," _ arg:lvalue { return arg; })* { return [first].concat(rest); })? _
  restArgs:("," _ restArgs:lvalueRest { return restArgs; })?
  _ ")" {
  return {
    args: args,
    restArgs: restArgs
  };
}

listItem = expression / spread

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

mapItem = mapKeyValueItem / mapKeyItem / spread

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

function = wordFn _ argsList:argsList _ "->" _ body:expression {
  return {
    type: "function",
    args: argsList.args,
    restArgs: argsList.restArgs,
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

case "case" = branches:(branch:caseBranch _ { return branch; })+ otherwise:caseOtherwise {
  return {
    type: "case",
    branches: branches,
    otherwise: otherwise,
    location: location()
  };
}

monadItem = via:(via:lvalue _ "=" _ { return via; })? value:expression {
  return {
    via: via,
    value: value,
    location: location()
  };
}

monadDo = wordDo _ item:monadItem {
  return item;
}

monadReturn = wordReturn _ item:monadItem {
  return item;
}

monad "monad" = items:(item:monadDo _ { return item; })+ lastItem:monadReturn {
  return {
    type: "monad",
    items: items.concat([lastItem]),
    location: location()
  };
}

definitionConstant = wordLet _ lvalue:(lvalue / operator) _ "=" _ value:expression {
  return {
    type: "definition.constant",
    lvalue: lvalue,
    value: value,
    location: location()
  };
}

definitionRecord = wordLet _ name:recordName _ args:(arg:name _ { return arg; })* {
  return {
    type: "definition.record",
    name: name,
    args: args,
    location: location()
  };
}

definitionFunction = wordLet _ name:(name / operator) _ argsList:argsList _ "->" _ body:expression {
  return {
    type: "definition.function",
    name: name,
    args: argsList.args,
    restArgs: argsList.restArgs,
    body: body,
    location: location()
  };
}

definition = definitionConstant / definitionRecord / definitionFunction

definitions = definitions:(definition:definition _ { return definition; })+ {
  return groupDefinitions(definitions);
}

scope "let" = definitions:definitions _ body:(wordIn _ body:expression { return body; }) {
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
  / monad
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

arg = expression / spread

args =
  "(" _
  args:(first:arg rest:(_ "," _ arg:arg { return arg; })* { return [first].concat(rest); })?
  _ ")" {
  return args || [];
}

call = callee:callee _ args:args {
  return {
    type: "call",
    callee: callee,
    args: args,
    location: location()
  };
}

property = "." property:name {
  return {
    type: "property",
    name: property.name,
    location: property.location
  };
}

access = property:property _ object:atom {
  return {
    type: "access",
    object: object,
    property: property,
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

binaryOperand = call / invoke / access / callee

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

symbol = name:(name / operator) {
  return {
    type: "symbol",
    name: name.name,
    location: name.location
  };
}

symbolsKeyNameItem = key:symbol _ ":" _ name:symbol {
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
