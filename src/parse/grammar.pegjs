{
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
        definitions: where.definitions,
        body: body
      };
    }
    else {
      return body;
    }
  }
}

ast = _ ast:(module / expression) _ {
  return ast;
}

__ "whitespace" = [ \t]*
_ "whitespace" = [ \t\n\r]*

reservedWord "special word" =
  wordWhen
  / wordElse
  / wordDo
  / wordEnd
  / wordWhere
  / wordModule
  / wordImport
  / wordExport

wordWhen "when" = "when" !beginNameChar
wordElse "else" = "else" !beginNameChar
wordDo "do" = "do" !beginNameChar
wordEnd "end" = "end" !beginNameChar
wordWhere "where" = "where" !beginNameChar
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

mapKeyValueItem = key:expression _ ":" _ value:expression {
  return {
    key: name,
    value: value
  };
}

mapKeyItem = key:name {
  return {
    key: name,
    value: name
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

lambda = "(" _ args:argsList _ "->" _ body:expression _ where:where? _ ")" {
  return {
    type: "lambda",
    args: args,
    body: withWhere(body, where),
    location: location()
  };
}

monadItem = via:(via:lvalue _ "<-" _ { return via; })? value:expression _ {
  return {
    via: via,
    value: value,
    location: location()
  };
}

monad "monad" =
  wordDo _
  branches:(first:monadItem rest:(_ item:monadItem { return item; })* { return [first].concat(rest); })
  _ wordEnd
  _
  where:where? {
    return withWhere({
      type: "monad",
      items: items
    }, where);
  }

caseBranch = wordWhen _ condition:expression _ ":" _ value:expression {
  return {
    condition: condition,
    value: value
  };
}

case "case" =
  branches:(first:caseBranch rest:(_ branch:caseBranch { return branch; })* { return [first].concat(rest); })
  _
  wordElse _ otherwise:expression
  _
  where:where? {
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
  / list
  / map
  / lambda
  / monad
  / name
  / case
  / subExpression

where = wordWhere _ definitions:definitions {
  return {
    type: "where",
    definitions: definitions
  };
}

noArgs "()" = "(" _ ")" {
  return [];
}

argsList = args:(noArgs / (arg:lvalue _ { return arg; })+) {
  return args;
}

unaryOperand = atom

unary = operator:operator __ operand:unaryOperand {
  return {
    type: "call",
    callee: operator,
    args:[operand],
    location: location()
  };
}

callee = unary / unaryOperand

call = callee:callee __ args:(noArgs / (arg:unaryOperand __ { return arg; })+) {
  return {
    type: "call",
    callee: callee,
    args: args,
    location: location()
  };
}

binaryOperand = call / callee

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

expression = binary / binaryOperand / operator

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

alias = "alias"

lvalue = name / alias / destruct

constantDefinition = lvalue:lvalue _ "=" _ value:expression {
  return {
    type: "constant",
    lvalue: lvalue,
    value: value,
    location: location()
  };
}

functionDefinition = name:name _ args:argsList _ "=" _ body:expression {
  return {
    type: "function",
    name: name,
    args: args,
    body: body,
    location: location()
  };
}

definition = constantDefinition / functionDefinition

definitions =
  definitions:(first:definition rest:(_ definition:definition { return definition; })* { return [first].concat(rest); }) {
    return groupDefinitions(definitions);
  }

module "module" =
  wordModule _ name:moduleName _
  definitions:definitions {
  return {
    type: "module",
    name: name,
    imports: [],
    export: { names: [] },
    definitions: definitions
  };
}
