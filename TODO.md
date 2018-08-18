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
- optimizations:
- optimize native things like `throw`, `instanceof` etc
- optimize to `===` when at least one is a primitive
- optimize operators
- template strings
- inlined TODOs
- source maps
- tests
