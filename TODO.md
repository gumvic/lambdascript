- `ReferenceError: a is not defined`:
```
let a = 42
let b where
  let a = a
end
```

- parse error
```
#{
  { a, b } = 42
}
```

- `maybe` has the default `f` that checks if `undefined`
- `seq` to accept a function that returns either `[value, next]` or `Done`
- `step` -> `next`?

- how to disable `@spec` in production?
- specs for rest args
- `@spec` is suboptimal as it can't insert asserts for recursive functions:
```
@spec aNonNegativeNumber aNonNegativeNumber
fac n = ...
=>
function fac() { ... fac(); ... }
fac = spec(fac); // at this point fac isn't assigned yet, so when spec runs check on it, fac will recursively call the vanilla, pre-spec version, i. e., the version without asserts
```

- io
```
io f = \...args -> f ...args
io o m = \...args -> invoke o m ...args
```

- better name for `maybe`
- `isBoolean`/`isString`/`isKey` etc to core
- `aTypeOf`

- `Point x y = whatever`, and `Point` will check in runtime if the `whatever` is a map and use it to init the record
- let it create `point/isPoint`, then?
- `Map` -> `map`, `map` -> `transform`/`each`/`fmap`?

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
- how to prove specs `a` and `b` represent the same? `assert a (generate b) && assert b (generate a)`
- therefore, we can have "type constraints" like `a -> b constraint a == b`, i. e. the specs are not necessarily the same themselves, but they still represent the same thing

- optimizations:
- functions with single arity don't need a dispatcher
- native things like `throw`, `instanceof` etc
- `===` when at least one is a primitive
- operators
- if there are no spreads in a `[]` or `{}` literal, use a simplified creation like `List([...])`
- `runSync`, `maybe` and any other built in parsers that this makes sense for

- make monads lazier, and perhaps make `run` simpler, then, so that the actions are not wrapped into functions
- `Map` redefines ES `Map`, the same for Set
- `&&` and `||` don't short circuit
- some operators should have zero arity with default result of `0`, `false` or whatever makes sense for them
- template strings

- inlined TODOs
- validate build options
- js module should be able to declare its name
- source maps
- REPL
- tests
