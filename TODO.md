- `ReferenceError: a is not defined`:
```
let a = 42
let b where
  let a = a
end
```

- greedy expressions
- ditch `autoImports` for good, just provide `core` in the options
- guard `get`, `monad` etc from being redefined by user -- `defineLocal` them when spawning a new context?
- put essentials somewhere in the configs for `check` and `generate` to use

- `n :: aBoolean = true`
- `fac n::(aNumber 1) :: (aNumber 1) = ...`

- check for essentials lazily
- ditch native property destructuring? maybe re-introduce property access like `.foo bar`?
- better name for `maybe`
- `isBoolean`/`isString`/`isKey` etc to core

- how to prove specs `a` and `b` represent the same? `assert a (generate b) && assert b (generate a)`
- therefore, we can have "type constraints" like `a -> b constraint a == b`, i. e. the specs are not necessarily the same themselves, but they still represent the same thing

- optimizations:
- call arities directly when possible, without dispatching
- native things like `throw`, `instanceof` etc
- `===` when at least one is a primitive
- operators
- `runSync`, `maybe` and any other built in parsers that this makes sense for

- variadic arguments and things like `foo ...foo 42 ...bar`
- `Map` redefines ES `Map`, the same for Set
- things like `{ :foo -> 42, ...bar, ...baz }` and `[42, ...foo, ...bar]`
- `&&` and `||` don't short circuit
- some operators should have zero arity with default result of `0`, `false` or whatever makes sense for them
- validate build options
- js module should be able to declare its name
- template strings
- source maps
- REPL
- tests
