# nihon-numbers
[![Node.js CI/CD](https://github.com/SimpleProgrammingAU/nihon-numbers/actions/workflows/main.yml/badge.svg)](https://github.com/SimpleProgrammingAU/nihon-numbers/actions/workflows/main.yml)
![GitHub issues](https://img.shields.io/github/issues/SimpleProgrammingAU/nihon-numbers)
![NPM Licence](https://img.shields.io/npm/l/nihon-numbers)
![npm bundle size](https://img.shields.io/bundlephobia/min/nihon-numbers)
![npm total downloads](https://img.shields.io/npm/dt/nihon-numbers)
![npm version](https://img.shields.io/npm/v/nihon-numbers)

A lightweight module to convert numbers from Arabic to Japanese characters.

## Installation
```sh
npm install --save nihon-numbers
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
```typescript
import { default as processNumber } from 'nihon-numbers';
const number = processNumber(3800);
console.log(number); //Outputs: 三千八百
```

## Test
```sh
npm run test
```