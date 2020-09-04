# timewaste

Lightweight execution time analyzer.
This package:
   1. reports execution statistics of code parts;
   1. follows execution consistency by reporting leaks;
   1. if function A calls function B and both are profiled, it will report A duration
   only the time spent outside of B code, so yo don't have to do lots of math to spot the slow code;
   1. can report different execution paths (call stacks) actually used;
   1. can handle program code exceptions in transparent way and report those, too;
   1. runs in both Node.js and browser environments (see compatibility list).

## Install
```
  yarn add timewaste
```
