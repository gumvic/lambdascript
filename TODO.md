- new name and global search and replace "mu"

- `core.native`:
- Immutable functions
- transducers -- `transduceColl :: xf coll`, `into :: coll -> (coll item -> coll)`
- transducers -- `def ~> coll xf = transduceColl xf coll`
- map/filter/etc
- map/filter/etc with indexes
- monads -- `Join`, `Point`, `monad`, `parse`, `>==`
- function composition -- `=>`/`<=`
- `toJS`,
- `typeof`
- `instanceof`
- js operators and `==`
- ?

- syntax sugar for transducing?
```
for [1, 2, 3]
  filter isEven,
  map inc,
  into []
```


- name clashes with auto generated names


- js module should be able to declare its name


- `core.monad.toIterable` for lazy sequences?


- auto `toJS` on export?
- export should allow just a value? auto `toJS` it or not?


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
- moduleName should have a quotes string variant, like `"foo bar"`
- asserts for args and returns? like `x: isNumber`, `f: isNumber isNumber -> isNumber`
- template strings
- auto import standard JS things like `Object`, `String` etc? (Note that `Map` will be a name conflict)
- `import (window, $) from ..` -- `..` means outside world
- optimize `get` AST with `getIn`
- multiple arguments like `f x y ...more`?
- use a third party js generator
- source maps
- CLI interface
- REPL
- tests
