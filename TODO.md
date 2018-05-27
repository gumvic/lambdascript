- `ReferenceError: a is not defined`:
```
let a = 42
let b where
  let a = a
end
```
- `imlist`, `immap`, `imrec` with variadic arguments
- `seq` and `done`
- `run`/`runSync` and `done`, maybe have it aliased as `return`
- validate options
- `&&` and `||` don't short circuit
- some operators should have zero arity with default result of `0`, `false` or whatever makes sense for them
- poor syntax error descriptions, parser fails too early
- js module should be able to declare its name
- syntax for sets, maybe `%{}`?
- template strings
- use a third party js generator -- `astring`/`estree`
- source maps
- REPL
- tests
