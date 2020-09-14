# timewaste

Lightweight execution time analyzer / profiler.

This package:
   1. can provide clean and focused reports immune to code bundling / optimization;
   1. can report execution statistics of any code sequences, not just functions;
   1. can handle concurrent threads / server endpoints;
   1. can handle callback-based code, like express.js middleware;
   1. monitors execution consistency by reporting "return leaks";
   1. in case of nested calls, both aggregated and self time can be reported;
   1. supports both Node.js and browser environments;
   1. allows performance monitoring and reporting to be controlled/analyzed programmatically.

**Note:**
Node.js [built-in profiler](https://nodejs.org/en/docs/guides/simple-profiling/),
as well as Developer Tools of some browsers
may provide all you need without installing anything - so please check those out
if you haven't done so.

## Install
```
  yarn add timewaste
```

## Usage
```javascript
import {profBeg, profEnd, profTexts} from 'timewaste'

function a(){
  profBeg('a')
  //  Do something and sometimes return from in the middle of the code.
  profEnd('a')
}

function b () {
  profBeg('b')
  //  Do something and sometimes call a()
  profEnd('b')
}

a()

console.log(profTexts())
```

Will produce an output similar to:
```
tag                          mean    count    total
-------------------------+--------+--------+-------
a              13       10      130
b             5.625        8       45

```

## Environment control
In _production mode_ (e.g. `process.env.NODE_ENV === 'production'`),
the package API will be replaced by set of empty calls returning empty objects of _false_
and introducing no computational overhead nor adding to code size.

To enable `timewaste` even in production build, set `TIMEWASTE` environment variable _true_.

## Error handling
Improper use of `timewaste` or code failures may result in errors.
The errors will never be thrown, however, but will be kept in internal array
available via `profStatus().errors`, resettable via `profOn(true)`.

## API functions

**`profBeg`**`(tag:string, threadId:number=) : boolean`

Creates a synchronous or asynchronous (thread) entry. The (tag, threadId) must be unique;
recursions not allowed. Returns _true_ on success, _false_ otherwise.
The `tag` must be a valid javascript identifier string.

**`profEnd`**`(tag:string, threadId:number=) : boolean`

Closes synchronous or asynchronous (thread) entry, summing it to respective measure.
Returns _true_ on success, _false_ otherwise.

**`profOn`**`(yes=)`

Query and possibly switch profiler activity status. Status is initially _true_;
while set to _false_, the `profBeg()` and `profEnd()` functions do nothing and return `false`.
Calling `profOn(true)` resets internal data structures.

**`profResults`**`(sortByField:string=, earlierResults:Object=) : Object[]`

Closes any pending measure entries, then
computes and returns array of measurement result objects, possibly combined with
`earlierResults`.
The array will be ordered ascending by `sortByField` defaulting to 'avg', other possible values
being 'count' and 'total'. Every entry in the array is an object with attributes:
   * `tag: string` - from `profBeg()` call, thread tags will be terminated by `'>'`;
   * `avg: *` - average duration of this sequence;
   * `count: *` - number of times this sequence has been executed;
   * `total: *` - total duration of this sequence;
   * `[leaks]: Array<[path, count]>` - cases when `profBeg` was called but `profEnd` was not.

Note, that numeric fields may be of `bigint` or `number` type, depending on `getTime()` in effect
(see profSetup()).

**`profSetup`**`(options:Object=) : Object`

Query and possibly change profiler general options, which can be:
   * `getTime: {function():*}` - function for querying current timestamp;
   * `timeScale: {number|bigint}` - must be the same type as `getTime()` return value;
   * `precision: {number=3}` - positions after decimal point, used by `profText()`;
   * `useSum: {boolean=true}` - true forces summary time, not self time to be accumulated and reported. 
   
Except for `useSum`, the other options are mainly useful just for testing.
In _Node.js_ environment, `getTime` defaults to `process.hrtime.bigint`, in browser environment to
`Date.now`; `timeScale` to `BigInt(1e3)` (microseconds) or `1` (milliseconds), respectively.

**`profStatus`**`() : Object`

Query for general status of profiling engine. The returned object has the following properties:
   * `enabled: boolean` - internal flag controllable via `profOn()`;
   * `[errors]: Error[]` - errors caused by bad API calls;
   * `[pending]: string[]` - currently open call stack;
   * `[running]: string[]` - list of currently running threads `'tag>id'`;

**`profText`**`(sortByField:string=, results:Object=) : string[]`

Turns `results` into line-by-line text array representing a pretty-printable table.
If `results` are omitted, then calls `profResults()` internally.
