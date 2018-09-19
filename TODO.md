# Features
- `tFunction` should always accept `res` and validate that its `fn` will always return something that casts to it; this is impossible without type checking types themselves, which in turn should be possible; so:
```
# tFunction :: fn([*], *, fn)
tFunction([tNumber], tNumber, fn(_) -> tNumber) # ok
tFunction([tNumber], tNumber, fn(_) -> tAny) # doesn't pass the type check
```
- type checking declarations
- dangling `declare`s -- check in `checkScope` and `endModule`
- modules
- repl should show the current module, like
```
repl>
```
- repl should also output the expression's type, like
```
repl> 42
42 : number(42)
```
- `generate` calls `define` directly
- keywords and fully qualified keywords
- `@` as a separator -- `core@+`, `core.contrib@++`, and then use `as` for aliases
- stick to native js data structures for now
- `define(name, data)`/`defined(name)` -> `symbol(name, data)`/`symbol(name)`
- `core` definitions should be frozen
- disallow `match`ing on functions?
- `checkCall` should understand `typeNone`
- `checkMatch` `else` should narrow, too, -- track the combinations in `when`, and assume the combinations that were left out
- `typeOr` should flatten and deduplicate its `types`; also, `typeOr` of one is just that one; same for `typeAnd`
- `not` type, like `!undefined`
- `_` should be typed, too
- lighter call syntax, `foo(a, b)` is ok, and also `foo a, b`, and obviously `run do ... end`
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

# Feature bugs
- this compiles, because the actual type overrides the declared one:
```
f: tFunction(tNumber, tNumber)
f = fn(x) -> x

x = f(null)
```
which is "correct" but unexpected;
a better example
```
x: tOr(tNumber, tString)
x = 42 # x is now officially tNumber
```
bug or feature?

# Optimizations
- optimize native things like `throw`, `instanceof` etc
- optimize when the AST's `$type` is a primitive with a value--just generate that value?
- optimize to `===` when at least one is a primitive
- optimize operators
- `match`ing can be inlined

# Misc
- clean up `package.json`
- inlined TODOs
- source maps
- tests
