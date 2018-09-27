# Features
- `tFunction` should always accept `res` and validate that its `fn` will always return something that casts to it; this is impossible without type checking types themselves, which in turn should be possible; so:
```
# tFunction :: fn([*], *, fn)
tFunction([tNumber], tNumber, fn(_) -> tNumber) # ok
tFunction([tNumber], tNumber, fn(_) -> tAny) # doesn't pass the type check
```
- check `eval`ed types in global context, also check they are actually types
- modules
- repl should show the current module, like
```
repl>
```
- keywords and fully qualified keywords
- `@` as a separator -- `core@+`, `core.contrib@++`, and then use `as` for destructuring aliases; maybe even `++@core.contrib`? or `core__+`, `core__get`? `$` as a separator? like `core$+`; or `core.+`, `core.get` etc
- `generate` should generate the call to `define`?
- hardcoded `$type` is bad
- docstrings
- `define` should be safe and guarantee all the checks--simply by calling `check`
- `_` value that has `typeNone` and is generated as `((() => throw "Not Implemented")())`
- `_` as a name, too, like `fn(_, _, z) -> z` doesn't complain about duplicates
- dangling `_` definitions -- check in `checkScope` and `endModule`
- dependencies
- type dependencies:
```
t = ...
f(x: t) = ...
t = ... # f should be checked; or should it?
```
- all `eval` should be in global context -- search globally
- stick to native js data structures for now, will need to implement `==` properly, but maybe `Immutable.is` will do
- nothing should throw, instead return `either`s
- disallow `match`ing on functions? or make use of `$type`? but consider this:
```
f: typeOr(typeFunction([typeNumber], typeNumber), typeFunction([typeString], typeString))
f = fn(x) -> x # or let's say based on some condition it's either fn(x) -> x + 42 or fn(x) -> x + "42"
match(f)
  when typeFunction([typeNumber], typeNumber): ... # how? lambdas can't have $type attached to them...
  when typeFunction([typeString], typeString): ...
  ...
end
```
- `checkMatch` `else` should narrow, too, -- track the combinations in `when`, and assume the combinations that were left out
- `checkCall` should understand `typeNone`
- `typeOr` should flatten and deduplicate its `types`; also, `typeOr` of one is just that one; same for `typeAnd`
- `not` type, like `!undefined`
- why have access syntax if we can have an operator? like `point ~> :x`
- lighter call syntax, `foo(a, b)` is ok, and also `foo a, b`, and obviously `run do ... end`, and for sure:
```
it "should pass", do
  assert(42 == 42)
end
```
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

# Featured bugs
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
