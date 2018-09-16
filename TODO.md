# Features
- `tFunction` should always accept `res` and validate that its `fn` will always return something that casts to it; this is impossible without type checking types themselves, which in turn should be possible; so:
```
# tFunction :: fn([*], *, fn)
tFunction([tNumber], tNumber, fn(_) -> tNumber) # ok
tFunction([tNumber], tNumber, fn(_) -> tAny) # doesn't pass the type check
```
- type checking declarations
- `checkCall` should account for `tNone`
- `checkCall` should account for `tAnd`
- `checkCall` should account for `tOr`
- `tOr` should flatten and deduplicate its `types`; also, `tOr` of one is just that one; same for `tAnd`
- `not` type, like `!undefined`
- ditch `tFn`, it's just a temporary convenience
- `_` should be typed, too
- lighter call syntax, `foo(a, b)` is ok, and also `foo a, b`, and obviously `run do ... end`
- js modules that require other local js modules, i. e., multi-file local js modules
- syntax for defining operators
- template strings

# Bugs
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

# Questions
- this compiles, because the actual type overrides the declared one:
```
ff: tFunction(tNumber, tNumber)
ff = fn(x) -> x

x = ff(null)
```
which is "correct" but unexpected


# Optimizations
- optimize native things like `throw`, `instanceof` etc
- optimize when the AST's `$type` is a primitive with a value--just generate that value?
- optimize to `===` when at least one is a primitive
- optimize operators

# Misc
- clean up `package.json`
- inlined TODOs
- source maps
- tests
