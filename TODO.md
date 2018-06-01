- `ReferenceError: a is not defined`:
```
let a = 42
let b where
  let a = a
end
```
- `mkList`, `mkMap`? `toList`, `toMap`? `imlist`, `immap`?
- things like `{ :foo -> 42, ...bar, ...baz }` and `[42, ...zaz, 43]`
- multiline expressions
- `<~` sucks
- variadic arguments and things like `foo ...foo 42 ...bar`
- pass `{}` to `hashmap` as a POJO when all the keys are literals
- `&&` and `||` don't short circuit
- some operators should have zero arity with default result of `0`, `false` or whatever makes sense for them
- guard `get`, `monad` etc from being redefined by user
- poor syntax error descriptions, parser fails too early
- validate build options
- js module should be able to declare its name
- template strings
- source maps
- REPL
- tests
