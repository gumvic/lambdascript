- `ReferenceError: a is not defined`:
```
let a = 42
let b where
  let a = a
end
```

- things like `{ :foo -> 42, ...bar, ...baz }` and `[42, ...foo, ...bar]`

- `list` should be variadic
- `map` should be variadic like `map :foo 42 :bar (fooza 43)`?

- `Map` redefines ES `Map`, the same for Set

- transducing a record gets a map, while it should get a record of the same type

- make records lightweight using symbols and generating `isX` automatically -- ditch `doneValue` etc, too, then?
- or maybe generate getters, too?
```
Point x y
# generates
isPoint
pointX
pointY
aPoint
```

- generative testing and "types":
```
nonNegativeNumber -> .rand Math 0
nonNegativeNumber x -> case
  when x >= 0 -> undefined
  else "#{x} is not a non negative number"
end
fac :: nonNegativeNumber -> nonNegativeNumber
fac n -> ...
test fac # generates test inputs and feeds it to fac, checking outputs
# Type operators
aNumber <||> aString # number or string
# reducer
let aDone t ->
  t' where
    t' -> done (t())
    t' x -> case
      when isDone x -> t(doneValue x)
      else -> "#{x} is not done"
    end
  end
let aReducer res x ->
  aFunction res' <||>
  aFunction res' res' <||>
  aFunction res' x res' where
  let res' = res <||> aDone res
end
# transducer
aTransducer res x = aFunction (aReducer res x) (aReducer res x)
aMaybe x -> x <||> anUndefined
# etc
```
- maybe also this:
```
# this generates an assert that is either inserted into the code itself right there,
# so that it's run once the module is loaded,
# OR
# it's run dynamically after the compilation
# the former is simpler, but will require the compiler option to disable runtime checks
fac :: aNonNegativeNumber -> aNonNegativeNumber
fac n -> ...
```

- variadic arguments and things like `foo ...foo 42 ...bar`

- pass `{}` to `toMap` as a POJO when all the keys are literals
- `&&` and `||` don't short circuit
- some operators should have zero arity with default result of `0`, `false` or whatever makes sense for them
- guard `get`, `monad` etc from being redefined by user during the check phase
- validate build options
- js module should be able to declare its name
- template strings
- source maps
- REPL
- tests
