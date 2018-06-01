- `ReferenceError: a is not defined`:
```
let a = 42
let b where
  let a = a
end
```
- `list` -> `vector`? `hashmap` -> `dict`?
- `<~` sucks
- `do` to use `,` separated syntax?
- rename `transduce` to `iterate`
- how about this:
```
iterate users do
  filter isAdult
  map getName
  take 5
end
```
- compile `{}` as `fromJS` when all the keys are literals
- `&&` and `||` don't short circuit
- some operators should have zero arity with default result of `0`, `false` or whatever makes sense for them
- guard `get`, `monad` etc from being redefined by user
- poor syntax error descriptions, parser fails too early
- validate build options
- js module should be able to declare its name
- syntax for sets, maybe `%{}`?
- template strings
- source maps
- REPL
- tests
