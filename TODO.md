- `.x.0.(z)` => `($coll_0) => getIn(coll_0, ["x", 0, z])`
- `.x.0.(z)!` => `($coll_0, $val_0) => setIn(coll_0, ["x", 0, z], $val_0)`

- js module should be able to both declare its name

- new name and global search and replace "mu"


- core
- functions must check arity (at least)
- transducers
- map/filter/etc
- map/filter/etc with indexes
- core.data, core.monad, core.io
- core.monad.toIterable?
- `==` means core.data.is


- syntax sugar for transducing?


- operators:
`let ! x -> ...` => `bang__`
`let ! x y -> ...` => `__bang__`
`let => x y -> y x` => `__equals_more__`
All the JS operators must be defined this way in the core.
But how to import them? `import { ++ } from extra-math` -- what's the arity?


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


- method call getters, like .toString(), and of course composable with getters, e. g., .name.toString().toLowerCase()


- js keywords as identifiers (also `arguments` and `this`)
- zero arity as a special case when calling
- setters like `.!x`, `.!x.!y` -- do chained setters make sense?
- moduleName should have a quotes string variant, like "foo bar"
- asserts for args and returns? like `f: isNumber isNumber -> isNumber`
- template strings
- auto import standard JS things like `Object`, `String` etc? (Note that `Map` will be a name conflict)
- `import (window, $) from ..` -- `..` means outside world
- source maps
- CLI interface
- REPL
