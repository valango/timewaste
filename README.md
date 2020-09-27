# timewaste
[![Build Status](https://travis-ci.org/valango/timewaste.svg?branch=master)](https://travis-ci.org/valango/timewaste) 
[![Code coverage](https://img.shields.io/codecov/c/gh/valango/timewaste?label=codecov&logo=codecov)](https://codecov.io/gh/valango/timewaste)

Lightweight multi-threading capable execution time analyzer / profiler.

This package:
   1. provides clean and focused reports immune to code bundling / optimization;
   1. reports execution statistics of any code sequences, not just functions;
   1. can handle concurrent threads / server endpoints;
   1. can handle callback-based code, like express.js middleware;
   1. monitors execution consistency by reporting "return leaks";
   1. in case of nested calls, both aggregated and self time can be reported;
   1. supports both _Node.js_ and browser environments;
   1. allows performance monitoring and reporting to be controlled/analyzed programmatically.

**Note:**
Node.js [built-in profiler](https://nodejs.org/en/docs/guides/simple-profiling/),
as well as Developer Tools of many browsers
may provide all you need without installing anything - so please check those out
if you haven't done so.

## Install
```shell script
   yarn add timewaste       # Either so...
   npm i -S timewaste       # or so.
```

## Usage
In order to do something, timewaste needs you to _waste some time
on **spicing** your code_ with its API calls, mostly (_`profBeg`_ and _`profEnd`_).

Here's an example:
```javascript
import {profBeg, profEnd, profTexts} from 'timewaste'

function a() {
  const h = profBeg('a')
  //  Do something and sometimes call b().
  profEnd(h)
}

function b () {
  const h = profBeg('b')
  //  Do something.
  profEnd(h)
}

for (let i = 0; i < 1000; ++i) a()

console.log(profTexts())
```

Will produce an output similar to:
```
*** LEAKS (1):
tag                                                   count
-----------------------------------------------------------
a b c d e f                                             766
a b c d e f g h i j k l m n o p                       10000

RESULTS:
tag   count     avg     time   total_avg   total_time
-----------------------------------------------------
e     10000   16.20   162036       16.20       162036
o     10000    9.89    98884        9.89        98884
 . . .
f       234    4.00        4      936.00          936
j     10000    0.42     4203       14.03       140277
p         0    0.00        0        0.00            0
```

This tells us that code sequence **`e`**, although gobbling up a gargantuan chunk
of execution time, might not be the main culprit, because some of it's sub-parts or
functions called, did the most.

Also, there have been some problem with function **`f`** which sometimes (not always,
as _count_ is not _`0`_) has terminated
(by throwing exception, returning or yielding a thread) without calling `profEnd()` first.
When it comes to **`p`** then it has never terminated as appropriate.

The leaks are most likely caused by missing something when spicing the target code,
and not by target code bugs as such.

## API
### Constants
**`P_TAG P_TIME P_AVG P_TOTAL P_TOT_AVG P_COUNT P_THREADS`**
numeric indexes of _measures record_ columns, also applicable to
[_sortByField_](#results) and [_fieldMask_](#texts) arguments.

**`P_NONE`** special value to prevent any sorting (mostly used internally).

**`P_HEADERS`** string array containing headers for `profTexts()` function.

### Functions
In the text below, the [jsdoc `{...}`](https://jsdoc.app/tags-type.html)
syntax is used sparingly;
`[type]` means that argument is optional or value may be _`undefined`_.

**`profBeg`**`(tag: string, threadId: [*]) : {number | boolean | undefined}`

Creates a call entry for the main or secondary thread.
Returns _numeric handle_ on success, _`false`_ on failure and
_`undefined`_ when profiler disabled.

**`profEnd`**`(handle: number, threadId: [*]) : {boolean | undefined}`

Closes an entry created by `profBeg()`.
Returns _true_ on success, _`false`_ on failure and
_`undefined`_ when profiler disabled.

**`profEnable`**`(yes=) : {boolean | undefined}`

Query and possibly switch profiler _enabled_ status, which is initially _true_.
While _false_, the `profBeg()` and `profEnd()` functions do nothing and return `false`.
Calling `profEnable(false)` while there are call pending will be ignored, and internal error
will be registered and `undefined` returned;
see [`profStatus()`](#status) for details.
<br />Profiling can be switched off and back on using this function.

<a name="results">**`profResults`**`(sortByField: [number], earlierResults: [Object]) : Object`</a>

Closes any pending measure entries, then
computes and returns array of measurement result objects, possibly combined with
`earlierResults`.
Unless _`sortByField`_ is -1, measures fill be sorted according to its value, which
should be one of exported _`F_...`_ constants; default is _`F_AVG`_.
The returned object has properties:
   * `[errors]: Array<Error>`,
   * `[leaks]: Array<[path, count]>` - cases when `profBeg` was called but `profEnd` was not.
   * `measures: Array<[]>` - profiling results sorted by `sortByField`.

**`profSetup`**`(options:Object=) : Object`

Query and possibly change profiler general options, which can be:
   * `getTime: {function():*}` - function for querying current timestamp;
   * `hook: {function():*}` - callback to be called before registering an internal error;
   * `timeScale: {number|bigint}` - must be the same type as `getTime()` return value;
   * `precision: {number=3}` - positions after decimal point, used by `profText()`;
   
In _Node.js_ environment, `getTime` defaults to `microtime`, in browser environment to
`Date.now`; `timeScale` to `BigInt(1e3)` (microseconds) or `1` (milliseconds), respectively.

Calling this function with an argument _will **reset all** internal data structures_.
Doing so repeatedly may significantly slow down the code.

<a name="status">**`profStatus`**`(details : boolean=) : Object`</a>

Query for general status of profiling engine. The returned object has the following properties:
   * `callDepth: number` - number of open synchronous entries;
   * `enabled: boolean` - internal flag controllable via `profEnable()`;
   * `errorCount: number`;
   * `leakCount: number`;
   * `threadCount: number`;
   
With `details` truey, the following extra properties will be available, too:
   * `errors: Error[]` - errors caused by bad API calls;
   * `openCalls: string[]` - currently open call stack as array of tags;
   * `openThreads: string[]` - list of currently running threads as `'tag>id'`.
   
<a name="texts">**`profText`**`(sortByField: [number], data: [Object], fieldMask: [number[]]) : string[]`</a>

Turns `data` into line-by-line text array representing a pretty-printable table.
If `data` are omitted, then calls `profResults()` is called to get one.

The `sortByField` argument here is analogous to the one of `profResults()` function.

When present, the `fieldMask` leaves on only the fields mentioned or excludes
fields with negative index, e.g. like in `profTexts([-P_TOTAL, -P_TIME])`. It is not
possible to exclude the _tag field_.

## In-depth

### Environment control
In **_production mode_** (e.g. `process.env.NODE_ENV === 'production'`),
the profiler code gets never loaded, and a do-nothing API will be exported instead.
So, no noticeable computational overhead nor extra code will be added.

To enable `timewaste` even in production build, set `TIMEWASTE` environment variable _true_.

### Error handling
Code failures and improper use of `timewaste` may result in errors.
Exceptions get thrown on bad calls (e.g. invalid argument type or format).
Other failures, like mismatched `profBeg/profEnd` pairs, will be silently accumulated
in internal collections
available via `profStatus().errors`, resettable via `profStatus()`.

### Multi-threading
When profiling code with actual multi-threading (like when using web workers) or
just asynchronously executed code (like Node.js web server end points), it is likely
(_`profBegin()`_,  _`profEnd()`_) call pairs get un-matched, effectively disabling
the profiler.

## Developer notes

Every feedback and assistance will be appreciated. Use github issues list first,
and feel free to make pull request of _**development** branch_ in order to contribute.

There is some documentation about its inner parts available in _`src/*.md`_ files.

### Instrumental scripts in `package.json`

   * **`clean`**: erase all temporary files but not installed dependencies,
   * **`lint`**: ...sure,
   * **`purge`**: erase everything, expect stuff kept in _VCS_,
   * **`speeds`**: speed benchmark,
   * **`test`**: module tests,
   * **`test:coverage`**: "codecov",
   * **`test1`**: e.g.: `yarn test1 numbers` to check for failures w/o generating coverage.
