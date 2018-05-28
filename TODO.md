- `ReferenceError: a is not defined`:
```
let a = 42
let b where
  let a = a
end
```
- exporting one name doesn't work
- `_`
- validate options
- `&&` and `||` don't short circuit
- some operators should have zero arity with default result of `0`, `false` or whatever makes sense for them
- guard `get`, `monad` etc from redefining by user
- poor syntax error descriptions, parser fails too early
- js module should be able to declare its name
- syntax for sets, maybe `%{}`?
- template strings
- use a third party js generator -- `astring`/`estree`
- source maps
- REPL
- tests
