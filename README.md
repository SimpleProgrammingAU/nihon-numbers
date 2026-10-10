# nihon-numbers

[![Node.js CI/CD](https://github.com/SimpleProgrammingAU/nihon-numbers/actions/workflows/main.yml/badge.svg?branch=master)](https://github.com/SimpleProgrammingAU/nihon-numbers/actions/workflows/main.yml)
![GitHub issues](https://img.shields.io/github/issues/SimpleProgrammingAU/nihon-numbers)
![NPM Licence](https://img.shields.io/npm/l/nihon-numbers)
![npm total downloads](https://img.shields.io/npm/dt/nihon-numbers)
![npm version](https://img.shields.io/npm/v/nihon-numbers)

A lightweight, dependency-free module that converts numbers from Arabic numerals to Japanese characters.

```javascript
processNumber(3800); // "三千八百"
```

## Installation

```sh
npm install nihon-numbers
```

## Usage

```typescript
import { processNumber } from "nihon-numbers";

processNumber(3800); // "三千八百"
processNumber(10.5); // "十"
processNumber(12345678901234567890n); // "千二百三十四京五千六百七十八兆九千十二億三千四百五十六万七千八百九十"
```

With CommonJS:

```javascript
const { processNumber } = require("nihon-numbers");
```

The default export from earlier versions still works with TypeScript and bundlers. In native Node.js ES modules, use the named import shown above.

## API

```typescript
processNumber(n: number | bigint): string
```

Converts a non-negative integer into Japanese characters.

- Decimals are rounded **down**: `10.5` becomes `十`.
- Zero becomes `零`.
- `一` is left out before 十, 百 and 千 (`十`, `百十`, `千`), but kept before 万 and the larger units (`一万`, `一億`).
- A `number` must not exceed `Number.MAX_SAFE_INTEGER` (9,007,199,254,740,991). For larger values, pass a `bigint`, up to 10<sup>72</sup> − 1.

### Errors

`processNumber` throws a `TypeError` when the input:

- is not a `number` or a `bigint`, including numeric strings such as `"123"`
- is `NaN`, `Infinity` or `-Infinity`
- is negative
- is a `number` above `Number.MAX_SAFE_INTEGER`
- is a `bigint` of 10<sup>72</sup> or more

### Examples

| Input           | Output                                       |
| --------------- | -------------------------------------------- |
| `0`             | 零                                           |
| `10`            | 十                                           |
| `35`            | 三十五                                       |
| `110`           | 百十                                         |
| `1000`          | 千                                           |
| `3800`          | 三千八百                                     |
| `10000`         | 一万                                         |
| `11000`         | 一万千                                       |
| `1801000`       | 百八十万千                                   |
| `130200000`     | 一億三千二十万                               |
| `9876543290187` | 九兆八千七百六十五億四千三百二十九万百八十七 |
| `10n ** 20n`    | 一垓                                         |

### Units

| Unit | Value           | Unit     | Value           |
| ---- | --------------- | -------- | --------------- |
| 十   | 10              | 穣       | 10<sup>28</sup> |
| 百   | 10<sup>2</sup>  | 溝       | 10<sup>32</sup> |
| 千   | 10<sup>3</sup>  | 澗       | 10<sup>36</sup> |
| 万   | 10<sup>4</sup>  | 正       | 10<sup>40</sup> |
| 億   | 10<sup>8</sup>  | 載       | 10<sup>44</sup> |
| 兆   | 10<sup>12</sup> | 極       | 10<sup>48</sup> |
| 京   | 10<sup>16</sup> | 恒河沙   | 10<sup>52</sup> |
| 垓   | 10<sup>20</sup> | 阿僧祇   | 10<sup>56</sup> |
| 𥝱   | 10<sup>24</sup> | 那由他   | 10<sup>60</sup> |
|      |                 | 不可思議 | 10<sup>64</sup> |
|      |                 | 無量大数 | 10<sup>68</sup> |

𥝱 is sometimes written as 秭.

## Upgrading from 1.0.x

Version 1.1.0 changes some results:

- `一` is no longer written before 千: `1000` returns `千` instead of `一千`, and `1801000` returns `百八十万千` instead of `百八十万一千`.
- Zero and decimals below 1 return `零` instead of throwing or returning an empty string.
- Numeric strings such as `"123"` now throw a `TypeError`.
- A `number` above `Number.MAX_SAFE_INTEGER` now throws instead of returning wrong digits. Pass a `bigint` instead.
- Decimals are rounded down without logging a warning to the console.

## Contributing

Bug reports and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to set up the project, run the checks and submit changes.

## License

[MIT](LICENSE) © Simple Programming
