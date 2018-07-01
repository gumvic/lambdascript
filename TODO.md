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

- `\x -> x` => `(x -> x)`?

- maybe add decorators and do things like:
```
let spec x = # spec as a constant
let spec f x ...args = # spec as a function

@spec aNonNegativeNumber
let n = 42

@spec aNonNegativeNumber aNonNegativeNumber
let fac n = ...
```
- but how to disable that in production?
- aliases then should look like this:
```
let f { node, step } -> m = ...
# vs
let f m@{ node, step } = ...
```
- decorators should be chainable, which makes it impossible to use `@` for aliases:
```
@a b
@c
# is it what it looks like or @a b@c?
let d =
```

- specs for rest args

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
- call arities directly when possible, without dispatching
- native things like `throw`, `instanceof` etc
- `===` when at least one is a primitive
- operators
- `runSync`, `maybe` and any other built in parsers that this makes sense for

- make monads lazier, and perhaps make `run` simpler, then, so that the actions are not wrapped into functions
- `Map` redefines ES `Map`, the same for Set
- `&&` and `||` don't short circuit
- some operators should have zero arity with default result of `0`, `false` or whatever makes sense for them
- template strings

- validate build options
- js module should be able to declare its name
- source maps
- REPL
- tests
