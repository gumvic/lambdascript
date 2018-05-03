- new name and global search and replace "mu"


- core
- transducers
- map/filter/etc
- map/filter/etc with indexes
- `core.data`, `core.monad`, `core.io`
- `==` means `core.data.is`
- `core.monad.toIterable`?


- syntax sugar for transducing?


- operators:
`let ! x -> ...` => `__bang__`
`let ! x y -> ...` => `__bang__`
`let => x y -> y x` => `__equals_more__`
Note that the arity doesn't affect the name.
All the JS operators must be defined this way in the core.
The binary ones should have a one argument variant.


- js module should be able to declare its name


- multiple arguments like `f x y ...more`?


- A.f and f shouldn't lead to duplicates, see groupFunctionDefinitions and how it groups using only name now
- A.f generates f function? (like in clojure)
- let Point x y -- generates Point (using Object.create(Point.prototype)); make Point inherit an immutable map, too?
- method duplicates
- constructors get the "new" function as their first argument?
```
Point -> Point 0 0
Point mk x y -> mk { x, y }
```


- method call getters, like `.toString()`
- setters like `.x=`
- syntax sugar for setting, like `coll.x.0 = 42`


- js keywords as identifiers (also `arguments` and `this`)
- zero arity as a special case when calling
- moduleName should have a quotes string variant, like "foo bar"
- asserts for args and returns? like `x: isNumber`, `f: isNumber isNumber -> isNumber`
- template strings
- auto import standard JS things like `Object`, `String` etc? (Note that `Map` will be a name conflict)
- `import (window, $) from ..` -- `..` means outside world
- source maps
- CLI interface
- REPL
