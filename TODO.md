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
- `case`, `scope` etc to atoms
- `_` should be typed, too
- `tFromValue` -> `typeof`, but this will replace the native `typeof`
- lighter call syntax, `foo(a, b)` is ok, and also `foo a, b`, and obviously `run do ... end`
- js modules that require other local js modules, i. e., multi-file local js modules
- make defining operators possible
- clean up `package.json`
- optimize native things like `throw`, `instanceof` etc
- optimize to `===` when at least one is a primitive
- optimize operators
- template strings
- inlined TODOs
- source maps
- tests
