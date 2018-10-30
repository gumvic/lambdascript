# monada

```
def core = let
  def comp[a, b, c](g: func(b, c), h: func(a, b)) =
    fn(a: a) -> g(h(a))
  in { comp }

def mod_value = record({
  type: type,
  to_string: func(type, string)
})

def maybe({ type: a_type, to_string: a_to_string }): mod_value = let
  def type = variant(a_type, Nil)
  def to_string(m: type) = match m
    when a_type: a_to_string(m)
    else ""
  in { type, to_string }
```
