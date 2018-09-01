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
- recursive functions, also check local contexts like js, so that the functions get to be defined first; maybe do it this way:
```
x: tString
print(x) # runtime exception
x = "foo"
print(x) # ok

let
  x: tString # compile time error - "x was declared but never defined"
  y = x
in
  y
end
```
- make `parse`/`check`/`generate` etc not throw, but return eithers
- namespaces and fully qualified names like `core.get`, `type.number` etc
- allow operator characters in names: if name only contains operator chars, that's an operator, otherwise a name, so:
```
+ # operator
+==-- # operator
to-string # name
function? # name
```
- make defining operators possible
- clean up `package.json`
- optimize native things like `throw`, `instanceof` etc
- optimize to `===` when at least one is a primitive
- optimize operators
- template strings
- inlined TODOs
- source maps
- tests
