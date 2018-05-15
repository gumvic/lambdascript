- monad -- not `def`, something else
- method calls like `(.foo obj 42)`
- operator generation
- `as` -> `:`, e. g. `{ value next : m }`
- `decomp` -> `assignment` or something

- `transduce` -> `for`
```
(for users
  (filter adult?)
  (map :name)
  (join ", "))
```
- `(get x:)`/`(get-in [x: y: :z])` versions instead of getters, the same for setters

- records
```
(defrec Point
  () (Point 0 0)
  (x) (Point x 0)
  (x y) { x: x
          y: y })
```
- methods
```
(defmeth Point sum ({ x y })
  (+ x y))
```

- map/filter/etc with indexes
- js module should be able to declare its name
- `#{ ... }` means set, `#[ ... ]` means stack
- template strings
- `import (window, $) from _` -- `_` means outside world
- `core.monad.toIterable` for lazy sequences?
- use a third party js generator
- source maps
- CLI interface
- REPL
- tests
