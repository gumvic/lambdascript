- scopes should be readable
- monads should generate lambdas
- if name clash, attach `_` until it doesn't clash

- `core.js`:
- js primitives
- collection constructors
- `==`
- `transduce`, `done`, `done?`
- `monad`, `monad?`

- map/filter/etc
- map/filter/etc with indexes


- Maybe monad -- `undefined` is `none`, everything else is `just`
- Error monad -- `instanceof Error` is `error`, everything else is `success`


- maybe `..` should be the method call operation, a separate one that's not chained?


- consider this
```
// this is fine:
export { foo, bar }

// this is not, because it will export an Immutable, instead of a JS map:
def baz = { foo: 42, bar: 43 }
export baz
```
- maybe only allow single exporting functions?
- probably auto `toJS` exports


- js module should be able to declare its name
- `#{ ... }` means set, `#[ ... ]` means stack
- `#(1 + _)` is a lambda


- A.f and f shouldn't lead to duplicates, see groupFunctionDefinitions and how it groups using only name now
- A.f generates f function? (like in clojure)
- let Point x y -- generates Point (using Object.create(Point.prototype)); make Point inherit an immutable map, too?
- `def Point` also generates `Point?`
- method duplicates
- constructors get the "new" function as their first argument?
```
Point -> Point 0 0
Point mk x y -> mk { x, y }
```


- method call getters, like `.toString()`/`.join(", ")`
- setters like `.x=`
- syntax sugar for setting, like `coll.x.0 = 42`


- js keywords as identifiers (also `arguments` and `this`)
- add descriptions to grammar
- name clashes with auto generated names
- asserts for args and returns? like `x: isNumber`, `f: isNumber isNumber -> isNumber`
- template strings
- auto import standard JS things like `Object`, `String` etc? (Note that `Map` will be a name conflict)
- `import (window, $) from ..` -- `..` means outside world
- optimize `get` AST with `getIn`
- `core.monad.toIterable` for lazy sequences?
- multiple arguments like `f x y ...more`?
- use a third party js generator
- source maps
- CLI interface
- REPL
- tests
