- import (window, $) from _ -- _ means outside world

- generate readable js

- new name and global search and replace "mu"

- template strings

- success messages like module foo compiled etc

- access -- a.b.c

- getter functions like .x, also chained, like .address.city; also, maybe they should use `get` if the data is immutable

- setters like .!x, .!x.!y -- do chained setters make sense?

- let Point x y -- generates mkPoint

- let Point.distance otherPoint = ...

- check arity on call?

- multiarity

- zero arity as a special case

- source maps

- CLI interface

- REPL
