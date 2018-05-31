- `ReferenceError: a is not defined`:
```
let a = 42
let b where
  let a = a
end
```
- transducers -- `isTuple`, `isList`, `isHashmap` etc
- spread like `[a, b ..defgh]`, `{ :a -> aa ..rest }`, call it `rest`
- let `list`, `hashmap` etc accept iterables, not variadic args? what about `tuple`, then?
- `<~` sucks
- exporting one name doesn't work
- add necessary functions like `merge` etc

- `_` -- it's `undefined` when used as a value and a name that can be redefined
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
