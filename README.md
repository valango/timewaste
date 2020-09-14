# timewaste

Lightweight execution time analyzer.

This package:
   1. reports execution statistics of any code parts;
   1. follows execution consistency by reporting leaks;
   1. in case of nested calls, both aggregated and pure time is available;
   1. supports concurrent threads;
   1. can handle callback-based code, like express.js middleware;
   1. runs in both Node.js and browser environments (see compatibility list);

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
