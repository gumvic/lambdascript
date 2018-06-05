- `ReferenceError: a is not defined`:
```
let a = 42
let b where
  let a = a
end
```
- things like `{ :foo -> 42, ...bar, ...baz }` and `[42, ...zaz, 43]`

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
number <||> string # number or string
# etc
```
- type definitions are just expressions
- type checkers are functions of two arities:
-- `0` for generating a test value; maybe a collection of them
-- `1` for checking a value, returning a `maybe error`

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
