- A.f and f shouldn't lead to duplicates, see groupFunctionDefinitions and how it groups using only name now

- A.f generates f function? (like in clojure)

- let Point x y -- generates Point (using Object.create(Point.prototype)); make Point inherit an immutable map, too?

- method duplicates

- constructors get the "new" function as their first argument?
Point -> Point 0 0
Point mk x y -> mk { x, y }


- maybe replace <- with = in monads?


- parse: AST "number" should have a string value, not the actual number


- js module should be able to both declare its name and require modules


- js keywords as identifiers


- zero arity as a special case when calling


- access -- a.b.c
- getter functions like .x, also chained, like .address.city; also, maybe they should use `get`/`getIn` if the data is immutable


- new name and global search and replace "mu"


- setters like .!x, .!x.!y -- do chained setters make sense?
- module names like "foo bar"
- asserts for args and returns? like f:isNumber x:isNumber y:isNumber = x + y
- template strings
- import (window, $) from .. -- .. means outside world
- operators
- source maps
- CLI interface
- REPL
