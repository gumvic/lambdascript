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
- `tFunction` should always accept `res` and validate that its `fn` will always return something that casts to it; this is impossible without type checking types themselves, which in turn should be possible; so:
```
# tFunction :: fn([*], *, fn)
tFunction([tNumber], tNumber, fn(_) -> tNumber) # ok
tFunction([tNumber], tNumber, fn(_) -> tAny) # doesn't pass the type check
```
- `_` should be typed, too
- refactor error classes, that many isn't needed
- make defining operators possible
- clean up `package.json`
- optimize native things like `throw`, `instanceof` etc
- optimize to `===` when at least one is a primitive
- optimize operators
- template strings
- inlined TODOs
- source maps
- tests
