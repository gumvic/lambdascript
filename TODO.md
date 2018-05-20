- `ReferenceError: users is not defined`:
```
let main = do
  print users;
end where
  let users = users
end
```
- use `$get`, `$ImMap`, `$run` etc when compiling so that the user wouldn't shadow them
- check `get`/`getIn` if destructuring, `ImMap` on a map literal etc.
- guards?
- `nil`?
- `end where` -> `ende`?
- `(get x:)`/`(get-in [x: y: z:])` versions instead of getters, the same for setters
- poor syntax error descriptions, parser fails too early
- map/filter/etc with indexes
- js module should be able to declare its name
- `#{ ... }` means set, `#[ ... ]` means stack
- template strings
- `import (window, $) from _` -- `_` means outside world
- `core.monad.toIterable` for lazy sequences?
- use a third party js generator -- `astring`/`estree`
- source maps
- CLI interface
- REPL
- tests
