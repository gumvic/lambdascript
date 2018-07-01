{
  function groupDefinitions(definitions) {
    let groupedDefinitions = [];
    let functions = {};
    for(let definition of definitions) {
      const { type, decorators, name, args, restArgs, body, location } = definition;
      if (type === "function") {
        const id = name.name;
        if (!functions[id]) {
          definition = {
            type: type,
            name: name,
            variants: [{ decorators, args, restArgs, body, location }],
            location: location
          };
          functions[id] = definition;
          groupedDefinitions.push(definition);
        }
        else {
          functions[id].variants.push({ decorators, args, restArgs, body, location });
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

nl = [\n\r] / [\n]

oneLineComment = "#" (!nl .)*
multilineComment = "#" "{" (multilineComment / (!"}" .))* "}"
comment = multilineComment / oneLineComment

reservedWord "special word" =
  wordCase
  / wordWhen
  / wordElse
  / wordDo
  / wordLet
  / wordWhere
  / wordEnd
  / wordModule
  / wordImport
  / wordExport

wordCase "case" = "case" !beginNameChar
wordWhen "when" = "when" !beginNameChar
wordElse "else" = "else" !beginNameChar
wordDo "do" = "do" !beginNameChar
wordLet "let" = "let" !beginNameChar
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

noArgsList = "(" ")" {
  return {
    args: []
  };
}

someArgsList = args:(arg:lvalue _ { return arg; })+ _ restArgs:restArgsList? {
  return {
    args: args,
    restArgs: restArgs
  };
}

restArgsList = "..." restArgs:lvalue {
  return {
    args: [],
    restArgs: restArgs
  };
}

argsList = noArgsList / someArgsList / restArgsList

noArgs = "(" ")" {
  return [];
}

someArgs = (arg:(atom / spreadAtom) _ { return arg; })+

args = noArgs / someArgs

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

spreadAtom = "..." value:atom {
  return {
    type: "spread",
    value: value,
    location: location()
  };
}

spreadExpression = "..." value:ensureExpression {
  return {
    type: "spread",
    value: value,
    location: location()
  };
}

listItem = expression / spreadExpression

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

mapKeyValueItem = key:expression _ "->" _ value:ensureExpression {
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

mapItem = mapKeyValueItem / mapKeyItem / spreadExpression

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

lambda = "(" _ argsList:argsList _ "->" _ body:ensureExpression _ ")" {
  return {
    type: "lambda",
    args: argsList.args,
    restArgs: argsList.restArgs,
    body: body,
    location: location()
  };
}

caseBranch = wordWhen _ condition:ensureExpression _ "->" _ value:ensureExpression {
  return {
    condition: condition,
    value: value
  };
}

caseOtherwise = wordElse _ otherwise:ensureExpression {
  return otherwise;
}

goodCase = branches:(branch:caseBranch _ { return branch; })+ otherwise:caseOtherwise {
  return {
    type: "case",
    branches: branches,
    otherwise: otherwise,
    location: location()
  };
}

badCase = . {
  error("Expected case", location());
}

case "case" = wordCase _ _case:(goodCase / badCase) _ end {
  return _case;
}

monadItem = via:(via:lvalue _ "<-" _ { return via; })? value:expression {
  return {
    via: via,
    value: value,
    location: location()
  };
}

goodMonad = items:(first:monadItem rest:(_ "," _ item:monadItem { return item; })* { return [first].concat(rest); }) {
  return {
    type: "monad",
    items: items,
    location: location()
  };
}

badMonad = . {
  error("Expected monad", location());
}

monad "monad" = wordDo _ monad:(goodMonad / badMonad) _ end {
  return monad;
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

unary = operator:operator _ operand:atom {
  return {
    type: "call",
    callee: operator,
    args: [operand],
    location: location()
  };
}

callee = unary / atom

call = callee:callee _ args:args {
  return {
    type: "call",
    callee: callee,
    args: args,
    location: location()
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

expression = expression:(binary / binaryOperand / operator) _ where:where? {
  return withWhere(expression, where);
}

badExpression = . {
  error("Expected expression", location());
}

ensureExpression = expression / badExpression

restItems = "..." lvalue:lvalue {
  return lvalue;
}

listDestruct =
  "[" _
  items:(first:lvalue rest:(_ "," _ item:lvalue { return item; })* { return [first].concat(rest); }) _
  restItems:("," _ restItems:restItems { return restItems; })?
  _ "]" {
  return {
    type: "listDestruct",
    items: items,
    restItems: restItems,
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
  restItems:("," _ restItems:restItems { return restItems; })?
  _ "}" {
  return {
    type: "mapDestruct",
    items: items,
    restItems: restItems,
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

decorator = "@" _ decorator:ensureExpression {
  return decorator;
}

constantDefinition = wordLet _ lvalue:(lvalue / operator) _ "=" _ value:ensureExpression {
  return {
    type: "constant",
    lvalue: lvalue,
    value: value,
    location: location()
  };
}

recordDefinition = wordLet _ name:recordName _ args:(arg:name _ { return arg; })* {
  return {
    type: "record",
    name: name,
    args: args,
    location: location()
  };
}

functionDefinition = wordLet _ name:(name / operator) _ argsList:argsList _ "=" _ body:ensureExpression {
  return {
    type: "function",
    name: name,
    args: argsList.args,
    restArgs: argsList.restArgs,
    body: body,
    location: location()
  };
}

definition =
  decorators:decorator* _
  definition:(constantDefinition / recordDefinition / functionDefinition) {
  definition.decorators = decorators;
  return definition;
}

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
