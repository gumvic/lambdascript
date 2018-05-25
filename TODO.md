- `ReferenceError: a is not defined`:
```
let a = 42
let b where
  let a = a
end
```
- allow operator characters in properties and use `[]` for invokations
- native transducers in Immutable
- `$` for composition? `iterate user (filter isAdult $ map getName)`
- `seq :: monad -> iterable` -- just walks through the monad, returning the points until it's exhausted
- validate options
- `hasp` like `has`
- `&&` and `||` don't short circuit
- poor syntax error descriptions, parser fails too early
- map/filter/etc with indexes
- js module should be able to declare its name
- syntax for sets, maybe `%{}`?
- template strings
- use a third party js generator -- `astring`/`estree`
- source maps
- REPL
- tests
