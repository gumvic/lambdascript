# Features
## Types
- if `typeFunction` receives the function, it should type check that function to return `res`:
```
typeFunction([typeNumber], typeNumber, fn(_) -> typeString) # won't pass, can't cast typeString to typeNumber
```
- `typeOr` should flatten and deduplicate its `types`; also, `typeOr` of one is just that one; same for `typeAnd`
- `not` type, like `!(typeUndefined | typeNull)`
- type the types
- when `update`ing a `map` with `key` and `value`:
-- if `key` casts to an existing item's key, that existing key's value is now `typeOr(existingValue, value)`
-- otherwise, just add to the items

## Meta
- hardcoded `$type` is bad
- docstrings
- `define` should be safe and guarantee all the checks?
- dangling `_` definitions -- check in `checkScope` and `endModule`
- dependencies
- type dependencies:
```
t = ...
f(x: t) = ...
t = ... # f should be checked; or should it?
```

## Syntax
- lighter call syntax, `foo(a, b)` is ok, and also `foo a, b`, and obviously `run do ... end`, and for sure:
```
it "should pass", do
  assert(42 == 42)
end
```
- syntax for defining operators
- `.` as a separator: `core.+`, `core.contrib.++`; in grammar, fully qualified names can't be lvalues, only `atom`s
- keywords and fully qualified keywords
- why have access syntax if we can have an operator? like `point ~> :x`
- template strings

## Misc
- local scope definitions should be scanned at once, not one by one, and redefinitions should be disabled
- nothing should throw, instead return `either`s
- `_` value that has `typeNone` and is generated as `((() => throw "Not Implemented")())`
- `_` as a name, too, like `fn(_, _, z) -> z` doesn't complain about duplicates
- `eval` should be in global context, to prevent local vars leaking in
- stick to native js data structures for now, will need to implement `==` properly, but maybe `Immutable.is` will do
- repl should show the current module, like
```
repl>
```
- check `eval`ed types in global context, also check they are actually types
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
