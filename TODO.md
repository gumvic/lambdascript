# Features

## Syntax

- uppercased names are symbols that have the same type, so `True` is a value of type `True`
- forall: `f[a, b](a: a, b: b)`

## Misc
- `parse`, `check` etc should not throw, instead return `either`s
- `_` as a name, like `fn(_, _, z) -> z` doesn't complain about duplicates
- `||` and `&&` should short circuit

# Bugs
- `ReferenceError: a is not defined`:
```
let
  a = 42
in
  let
    a = a
  in a
```

# Misc
- clean up `package.json`
- inlined TODOs
- source maps
- tests
