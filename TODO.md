- move self importing and duplicate imports checks to check


- export should only accept either an identifier or { identifiers }


- multiarity

- zero arity as a special case

- check arity on call?


- AST for module sucks -- module, alias, globals, all that should be renamed


- let Point x y -- generates Point (using Object.create(Point.prototype)); make Point inherit an immutable map, too?

- multiple arity:
  let Point x = Point x 0
  let Point x y = { "x": x, "y": y }

- let Point.distance otherPoint = ...


- js module should be able to both declare its name and require modules


- new name and global search and replace "mu"


- access -- a.b.c

- getter functions like .x, also chained, like .address.city; also, maybe they should use `get`/`getIn` if the data is immutable

- setters like .!x, .!x.!y -- do chained setters make sense?


- asserts for args and returns? like f:isNumber x:isNumber y:isNumber = x + y


- template strings

- import (window, $) from .. -- .. means outside world

- operators

- source maps

- CLI interface

- REPL
