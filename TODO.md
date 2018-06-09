- `ReferenceError: a is not defined`:
```
let a = 42
let b where
  let a = a
end
```

- white space syntax
- better imports that ideally will make redefining essentials impossible

- `check` and `aFunction` to essentials
- check for essentials lazily
- ditch native property destructuring? maybe re-introduce property access like `.foo bar`?
- `run` should stop on error

- optimizations:
- call arities directly when possible, without dispatching
- native things like `throw`, `instanceof` etc
- `===` when at least one is a primitive
- operators
- `runSync`

- variadic arguments and things like `foo ...foo 42 ...bar`
- `Map` redefines ES `Map`, the same for Set
- things like `{ :foo -> 42, ...bar, ...baz }` and `[42, ...foo, ...bar]`
- `&&` and `||` don't short circuit
- some operators should have zero arity with default result of `0`, `false` or whatever makes sense for them
- guard `get`, `monad` etc from being redefined by user -- `defineLocal` them when spawning a new context?
- validate build options
- js module should be able to declare its name
- template strings
- source maps
- REPL
- tests
