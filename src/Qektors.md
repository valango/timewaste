## Qektors

_LIFO_ of numeric keyed vectors (_qektors_).
Designed for the profiler to run quickly and keep _Garbage Collector_ dormant.

**`Qektors`** is an array of (presumably) typed arrays of the same length.
The first element of _qektor_ is a non-zero numeric key (often index to another _qektor_)

**NB:** index value `0` means _no match_ (as does `-1` for `Array.prototype.indexOf()`).

Because `Qektors` (almost) won't check for possible errors, use `StrictQektors`
while debugging.

### Constructor

**`Qektors`**`(options : Object=)`<br />
Creates a new collection instance based on options:
   * `native : {function(size)}` - constructor for allocating entries;
   * `width : {number}` - length of entry (must be at least 1).

### Instance properties

**`Ctr`**`: function ` **r/o**<br />
Constructor for entries.

**`isLocked`**`: boolean ` **r/o**<br />
Used by _profiler_.

**`isTyped`**`: boolean ` **r/o**<br />
_`true`_ if entries use `TypedArray` interface.

**`next`**`: Qektors `<br />
Used by the profiler.

**`size`**`: number ` **r/o**<br />
Active entries count (same as `topIndex`).

**`strict`**`: boolean ` **r/o**<br />
_`true`_ if this is a `StrictQuektors` instance.

**`top`**`: TypedArray  |Array ` **r/o**<br />
The last entry or _`undefined`_ if container is empty.

**`topIndex`**`: number ` **r/o**<br />
Index of the top entry (equals `size`).

**`total`**`: number `<br />
Used by _profiler_.

**`volume`**`: number ` **r/o**<br />
Total size of entries pool (for diagnostics).

**`width`**`: number ` **r/o**<br />
Entry length.

### Instance methods

**`at`**`(index : number) : TypedArray | Array | underfined`<br />
Retrieves an active entry by `index`.

**`clear`**`()`<br />
Discards all active entries.

**`delete`**`() : number`<br />
Discards the topmost entry and returns new `topIndex` value.
Does nothing if no entries left.

**`grant`**`(key: number) : number`<br />
Finds a matching entry or allocates a new one, setting its key.
Returns index to this entry.

**`indexOf`**`(key: number) : number`<br />
Returns index of matching entry, `0` when none.

**`map`**`(callback: function(*,*,*): *) : Array`<br />
Analog of `Array.prototype.map()`. Iterates over active entries.

**`push`**`(...values) : number`<br />
Adds a new entry making it a top. Returns increased `topIndex`.

_**NB:** `Qektors` won't check for uniqueness of `values[0]` (a key value)._
Pushing non-unique keys would likely corrupt the data model.
Use **`StrictQektors`** to fish out bugs like that.
