# timewaste

Lightweight execution time analyzer.

This package:
   1. reports execution statistics of any code parts;
   1. follows execution consistency by reporting leaks;
   1. in case of nested calls, both aggregated and pure time is available;
   1. can report different execution paths (call stacks) actually used;
   1. supports concurrent threads;
   1. can handle callback-based code, like express.js middleware;
   1. runs in both Node.js and browser environments (see compatibility list);

## Install
```
  yarn add timewaste
```
