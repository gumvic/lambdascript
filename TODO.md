- `ReferenceError: a is not defined`:
```
let a = 42
let b where
  let a = a
end
```
- from instances to POJOs for `done` and monads
- `statefulXF :: xf -> xf` will expect the resulting reducer to be `[state, x] -> [state, res]`
- `seq :: monad -> iterable` -- just walks through the monad, returning the points until it's exhausted
- `take`
- `indexed`
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
