- `transduce` -> `for`
```
(for users
  (filter adult?)
  (map :name)
  (join ", "))
```
- `as` keyword
- monad -- not `def`, something else
- method calls like `(.foo obj 42)`
- getters like `.x.y.z` and `:x:y:z`


- map/filter/etc with indexes
- Maybe monad -- `undefined` is `none`, everything else is `just`
- Error monad -- `instanceof Error` is `error`, everything else is `success`
- js module should be able to declare its name
- `#{ ... }` means set, `#[ ... ]` means stack
- `#(1 + _)` is a lambda
- js keywords as identifiers (also `arguments` and `this`)
- name clashes with auto generated names
- asserts for args and returns? like `x: isNumber`, `f: isNumber isNumber -> isNumber`
- template strings
- `import (window, $) from ..` -- `..` means outside world
- `core.monad.toIterable` for lazy sequences?
- use a third party js generator
- source maps
- CLI interface
- REPL
- tests
