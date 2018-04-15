- import (window, $) from .. -- .. means outside world

- generate readable js

- js module should be able to both declare its name and require modules

- new name and global search and replace "mu"

- template strings

- success messages like module foo compiled etc

- access -- a.b.c

- getter functions like .x, also chained, like .address.city; also, maybe they should use `get` if the data is immutable

- setters like .!x, .!x.!y -- do chained setters make sense?

- let Point x y -- generates mkPoint, isPoint

- let Point.distance otherPoint = ...

- check arity on call?

- multiarity

- zero arity as a special case

- source maps

- CLI interface

- REPL
