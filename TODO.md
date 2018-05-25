- `ReferenceError: a is not defined`:
```
let a = 42
let b where
  let a = a
end
```
- `&&` and `||` don't short circuit
- `seq :: monad -> iterable` -- just walks through the monad, returning the points until it's exhausted
- records should be iterable
- validate options
- lambda syntax: `\($a + $b)`? `#(get _ :foo)`? `\(get $x :foo)`, `\($x + $y)`?
- poor syntax error descriptions, parser fails too early
- map/filter/etc with indexes
- js module should be able to declare its name
- syntax for sets, maybe `%{}`?
- template strings
- use a third party js generator -- `astring`/`estree`
- source maps
- REPL
- tests
