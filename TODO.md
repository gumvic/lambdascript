- module names like "foo bar"


- A.f and f shouldn't lead to duplicates, see groupFunctionDefinitions and how it groups using only name now


- let Point x y -- generates Point (using Object.create(Point.prototype)); make Point inherit an immutable map, too?

- let Point.distance otherPoint = ...


- js module should be able to both declare its name and require modules


- js keywords as identifiers


- maybe replace <- with = in monads?


- zero arity as a special case when calling


- access -- a.b.c
- getter functions like .x, also chained, like .address.city; also, maybe they should use `get`/`getIn` if the data is immutable


- new name and global search and replace "mu"


- setters like .!x, .!x.!y -- do chained setters make sense?


- asserts for args and returns? like f:isNumber x:isNumber y:isNumber = x + y

- template strings

- import (window, $) from .. -- .. means outside world

- operators

- source maps

- CLI interface

- REPL
