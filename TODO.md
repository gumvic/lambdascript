- `ReferenceError: a is not defined`:
```
let a = 42
let b where
  let a = a
end
```

- `Point x y = whatever`, and `Point` will check in runtime if the `whatever` is a map and use it to init the record
- let it create `point/isPoint`, then?
- `Map` -> `map`, `map` -> `transform`/`each`/`fmap`?

- `n :: aBoolean = true`
- `fac n::(aNumber 1) :: (aNumber 1) = ...`
- `? { ... }` => `aMap { ... }`
- `?`:
```
user = ?{ :name -> ?:string }
[user] ?> ?:string
getName a = [?{ :name -> a }] ?-> a

[$:string] $-> $:number
[?:string] ?-> ?:number

<?> # or
?=> # multifunction

reducer res x =
  [res] ?=>
  [res res] ?=>
  [res x res]
```

- better name for `maybe`
- `isBoolean`/`isString`/`isKey` etc to core
- `aTypeOf`

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
- template strings
- js module should be able to declare its name
- source maps
- REPL
- tests
