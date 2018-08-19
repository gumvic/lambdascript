- `ReferenceError: a is not defined`:
```
let
  a = 42
in
  let
    a = a
  in
    a
  end
end
```
- consecutive calls: `f(x)(y)`
- `define` (make `generate` just call it instead of generating globals), `compile`
- for programs, `parse` the whole thing, but then `check`/`generate` step by step
- meta, types functions etc all should expect immutable, so stick to `immutable.get` etc instead of direct access
- make types simpler, like:
```
{
  type: "string",
  value: "foo",
  readable: "string(foo)",
  cast: ...
}
{
  type: "or",
  types: [
    { ... },
    { ... },
    ...
  ],
  readable: ...,
  cast: ...
}
```
- make types implement `castFrom` and `castTo`; this will make possible negative types like `tExcept(tUndefined)` and also backward compatibility when e. g. introducing `tNumberBetween(0, 42)` that will be possible to cast to `tNumber` without `tNumber` having to acknowledge the existence of `tNumberBetween`
- make `parse`/`check`/`generate` etc not throw, but return eithers
- namespaces and fully qualified names like `core.get`, `type.number` etc
- allow operator characters in names
- clean up `package.json`
- optimize native things like `throw`, `instanceof` etc
- optimize to `===` when at least one is a primitive
- optimize operators
- template strings
- inlined TODOs
- source maps
- tests
