- A.f and f shouldn't lead to duplicates, see groupFunctionDefinitions and how it groups using only name now
- let Point x y -- generates Point (using Object.create(Point.prototype)); make Point inherit an immutable map, too?
- method duplicates


- `transduce coll xf...` where the `xf`s will be composed automatically:
`adultNames users = transduce users (filter isAdult) (map .name)`


- map/filter/etc with indexes
- Maybe monad -- `undefined` is `none`, everything else is `just`
- Error monad -- `instanceof Error` is `error`, everything else is `success`
- setters like `.x=`
- syntax sugar for setting, like `coll.x.0 = 42`
- js module should be able to declare its name
- `#{ ... }` means set, `#[ ... ]` means stack
- `#(1 + _)` is a lambda
- js keywords as identifiers (also `arguments` and `this`)
- add descriptions to grammar
- name clashes with auto generated names
- asserts for args and returns? like `x: isNumber`, `f: isNumber isNumber -> isNumber`
- template strings
- auto import standard JS things like `Object`, `String` etc? (Note that `Map` will be a name conflict)
- `import (window, $) from ..` -- `..` means outside world
- `core.monad.toIterable` for lazy sequences?
- multiple arguments like `f x y ...more` and other destructuring
- use a third party js generator
- source maps
- CLI interface
- REPL
- tests
