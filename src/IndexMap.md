## IndexMap

A dictionary registering _non-falsy keys_, mapping those
to positive integer values. It uses native
[`Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)
object internally.

Using _`IndexMap`_, it is easy to implement complex data models using
numeric arrays only, which can be more efficient than using mixed value arrays
and dynamically keyed objects.

**NOTE:** Using _object keys_ may lead to _memory leaks_ (see
[`WeakMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)
documentation).

### Instance methods

**`at`**`(index : number) : *`<br />
Retrieves a key by its index. Returns `undefined`, if none is found.

**`clear`**`()`<br />
Clears all data.

**`delete`**`(key : *) : boolean`<br />
Deletes entry by `key`; returns _true_ if there is one.

**`get`**`(key : *) : number`<br />
Retrieves index for key. Returns `0`, if none is found.

**`put`**`(key : *) : number`<br />
Retrieves index for key or creates an entry for it. Returns a positive integer on success,
`0` otherwise.

It is not possible to register falsy keys nor `NaN`. However, any other scalars and objects
can be used. Exact comparision is used, e.g. two sequential calls of `put({})` would
create two different entries.

**`size`**`() : number`<br />
Returns number of dictionary entries.
