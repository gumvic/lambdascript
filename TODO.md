- `generate` -- `lines`

- `transduce` -> `for`
```
(for users
  (filter adult?)
  (map :name)
  (join ", "))
```
- monad -- not `def`, something else
- method calls like `(.foo obj 42)`

- `(get x:)`/`(get-in [x: y: :z])` versions instead of getters, the same for setters


- map/filter/etc with indexes
- js module should be able to declare its name
- `#{ ... }` means set, `#[ ... ]` means stack
- `#(1 + _)` is a lambda
- js keywords as identifiers (also `arguments` and `this`)
- name clashes with auto generated names
- template strings
- `import (window, $) from ..` -- `..` means outside world
- `core.monad.toIterable` for lazy sequences?
- use a third party js generator
- source maps
- CLI interface
- REPL
- tests
