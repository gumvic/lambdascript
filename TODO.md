- `ReferenceError: a is not defined`:
```
let a = 42
let b = a where
  let a = a
end
```
- `seq :: monad -> iterable` -- just walks through the monad, returning the points until it's exhausted
- use `$get`, `$ImMap`, `$run` etc when compiling so that the user wouldn't shadow them
- check `get`/`getIn` if destructuring, `ImMap` on a map literal etc.
- guards?
- lambda syntax: `($a + $b)`? `(get _ foo:)`
- poor syntax error descriptions, parser fails too early
- map/filter/etc with indexes
- js module should be able to declare its name
- `#{ ... }` means set, `#[ ... ]` means stack
- template strings
- use a third party js generator -- `astring`/`estree`
- source maps
- CLI interface
- REPL
- tests
