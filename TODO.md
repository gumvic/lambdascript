# Features
## Meta
- `load` -> `import`
- docstrings
- dependencies

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
- `_` that is generated as `((() => throw "Not Implemented")())`; or how about having `panic` function that just throws its argument?
- `_` as a name, too, like `fn(_, _, z) -> z` doesn't complain about duplicates
- stick to native js data structures for now, will need to implement `==` properly, but maybe `Immutable.is` will do
- repl should show the current module, like
```
repl>
```
- operators don't short circuit

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
- optimize to `===` when at least one is a primitive
- optimize operators

# Misc
- clean up `package.json`
- inlined TODOs
- source maps
- tests
