- `ReferenceError: a is not defined`:
```
let a = 42
let b = a where
  let a = a
end
```
- drop `isBuiltinOperator` for now, since the user might redefine operators
- operator optimization including `==`, `isa` and `typeof`
- validate options
- `seq :: monad -> iterable` -- just walks through the monad, returning the points until it's exhausted
- lambda syntax: `\($a + $b)`? `#(get _ :foo)`? `\(get $x :foo)`, `\($x + $y)`?
- poor syntax error descriptions, parser fails too early
- map/filter/etc with indexes
- js module should be able to declare its name
- syntax for sets
- template strings
- use a third party js generator -- `astring`/`estree`
- source maps
- CLI interface
- REPL
- tests
