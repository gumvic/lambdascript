- record destructuring like `Done { value }`
- `match` case:
```
match a, b
  when 0, 1 -> a
  else b
end
```
- matching -- introduce primitives as lvalues, too
- `ReferenceError: a is not defined`:
```
let a = 42
let b = a where
  let a = a
end
```
- generate `isa`, `type` as `instanceof` and `typeof`
- `seq :: monad -> iterable` -- just walks through the monad, returning the points until it's exhausted
- use `$get`, `$ImMap`, `$run` etc when compiling so that the user wouldn't shadow them?
- check `get`/`getIn` if destructuring, `ImMap` on a map literal etc.
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
