# nihon-numbers
[![Build Status](https://travis-ci.org/SimpleProgrammingAU/nihon-numbers.svg?branch=master)](https://travis-ci.org/SimpleProgrammingAU/nihon-numbers)
[![Coverage Status](https://coveralls.io/repos/github/SimpleProgrammingAU/nihon-numbers/badge.svg?branch=master)](https://coveralls.io/github/SimpleProgrammingAU/nihon-numbers?branch=master)
![GitHub issues](https://img.shields.io/github/issues/SimpleProgrammingAU/nihon-numbers)
![NPM Licence](https://img.shields.io/npm/l/nihon-numbers)
![npm bundle size](https://img.shields.io/bundlephobia/min/nihon-numbers)
![npm total downloads](https://img.shields.io/npm/dt/nihon-numbers)
![npm version](https://img.shields.io/npm/v/nihon-numbers)

A lightweight module to convert numbers from Arabic to Japanese characters.

## Installation
```sh
npm i --save nihon-numbers
```

## API
```javascript
processNumber(number)
```
Converts the input number into Japanese characters.

### Arguments
> `number: number`: The input integer to convert. Note: any decimal values will be rounded **down**.

### Returns
> `string`: The character representation of the input number.

## Usage
### JavaScript
```javascript
const processNumber = require('nihon-numbers');
const number = processNumber(1500000);
console.log(number); //Outputs: 百五十万
```

### TypeScript
```typescript
import { default as processNumber } from 'nihon-numbers';
const number = processNumber(3800);
console.log(number); //Outputs: 三千八百
```

## Test
```sh
npm run test
```