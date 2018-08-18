- `ReferenceError: a is not defined`:
```
let
  a = 42
in
  let
    a = a
  in
    a
  end
end
```
- consecutive calls: `f(x)(y)`
- if we define `f` globally while checking, and then the check fails, it should be de-defined, including the case when the previous value should be brought back
- optimize native things like `throw`, `instanceof` etc
- optimize to `===` when at least one is a primitive
- optimize operators
- template strings
- inlined TODOs
- source maps
- tests
