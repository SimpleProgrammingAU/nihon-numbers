# nihon-numbers

[![Node.js CI/CD](https://github.com/SimpleProgrammingAU/nihon-numbers/actions/workflows/main.yml/badge.svg?branch=master)](https://github.com/SimpleProgrammingAU/nihon-numbers/actions/workflows/main.yml)
![GitHub issues](https://img.shields.io/github/issues/SimpleProgrammingAU/nihon-numbers)
![NPM Licence](https://img.shields.io/npm/l/nihon-numbers)
![npm total downloads](https://img.shields.io/npm/dt/nihon-numbers)
![npm version](https://img.shields.io/npm/v/nihon-numbers)

A lightweight, dependency-free module that converts numbers between Arabic numerals and kanji numerals (三千八百). It can also write numbers one kanji digit at a time (三八〇〇), for practising reading kanji digits.

```javascript
processNumber(3800); // "三千八百"
processNumber(3800, "toPositional"); // "三八〇〇"
processNumber("三千八百", "toArabic"); // "3800"
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
processNumber(2026, "toPositional"); // "二〇二六"
processNumber("一億三千二十万", "toArabic"); // "130200000"
processNumber("二〇二六", "toArabic"); // "2026"
```

With CommonJS:

```javascript
const { processNumber } = require("nihon-numbers");
```

The default export from earlier versions still works with TypeScript and bundlers. In native Node.js ES modules, use the named import shown above.

## API

```typescript
processNumber(n: number | bigint, direction?: "toAdditive" | "toPositional"): string
processNumber(n: string, direction: "toArabic"): string
```

`direction` defaults to `"toAdditive"`.

Don't pass `processNumber` straight to `map` or `forEach`. They pass the index as the second argument, which `processNumber` rejects as a direction. Wrap it instead:

```typescript
[2025, 2026].map((n) => processNumber(n)); // ["二千二十五", "二千二十六"]
```

### Additive notation: `"toAdditive"`

Converts a non-negative integer into additive notation, which writes each digit followed by its unit: 2026 becomes 二千二十六. This is the default.

- Decimals are rounded **down**: `10.5` becomes `十`.
- Zero becomes `零`.
- `一` is left out before 十, 百 and 千 (`十`, `百十`, `千`), but kept before 万 and the larger units (`一万`, `一億`).
- A `number` must not exceed `Number.MAX_SAFE_INTEGER` (9,007,199,254,740,991). For larger values, pass a `bigint`, up to 10<sup>72</sup> − 1.

### Positional notation: `"toPositional"`

Converts a non-negative integer into positional notation, which writes one kanji digit per decimal place: 2026 becomes 二〇二六.

Use it to practise reading kanji digits quickly, without working through 十, 百, 千 and the large units. Japanese writes few numbers this way, mainly years, phone numbers and addresses in vertical text, and even then reads 二〇二六年 the same as 二千二十六年: _nisen nijūroku nen_. For numbers as they're normally written, use `"toAdditive"`.

- Zero becomes `〇`, both on its own and inside a number (`二〇〇五`).
- It takes the same input as `"toAdditive"`, with the same rounding and limits.

### Kanji to Arabic: `"toArabic"`

Converts kanji numerals in either notation into Arabic numerals.

It returns a string, such as `"3800"`, because kanji numerals go up to 10<sup>72</sup> − 1, far beyond what a `number` can hold exactly. Convert the result when you need to do arithmetic:

```typescript
Number(processNumber("三千八百", "toArabic")); // 3800
BigInt(processNumber("一無量大数", "toArabic")); // 10n ** 68n
```

The result never has leading zeros, and zero is `"0"`.

It accepts:

- everything `"toAdditive"` and `"toPositional"` output
- `零` or `〇` on its own for zero
- `一` before 十, 百 and 千: `一千`, `一百一十`
- `秭` in place of `𥝱`
- `○` (a white circle, often typed instead of `〇`) wherever `〇` is accepted: `二○二六` becomes `"2026"`
- leading `〇`s in positional notation: `〇〇五` becomes `"5"`

It rejects:

- `零` inside a number (`二零二六`) and `〇` or `○` inside additive notation (`二千〇五`)
- a large unit without a number before it: `万` instead of `一万`
- large units out of order: `一万一億`
- daiji (`壱`, `弐`, `拾`, `萬`), `廿` and `卅`, decimals, negative numbers, counters and suffixes such as `年` or `円`, Arabic or full-width digits, and whitespace
- positional notation longer than 72 digits, not counting leading `〇`s

### Errors

Errors are built-in `TypeError`, `RangeError` and `SyntaxError` objects, each with a `code` that says what went wrong:

| Code                | Type          | Thrown when                                                                                                               |
| ------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `INVALID_DIRECTION` | `TypeError`   | `direction` is not `"toAdditive"`, `"toPositional"` or `"toArabic"`                                                       |
| `INVALID_TYPE`      | `TypeError`   | the input is not a `number` or a `bigint` (including numeric strings such as `"123"`), or, for `"toArabic"`, not a string |
| `NOT_FINITE`        | `RangeError`  | the input is `NaN`, `Infinity` or `-Infinity`                                                                             |
| `NEGATIVE`          | `RangeError`  | the input is negative                                                                                                     |
| `UNSAFE_INTEGER`    | `RangeError`  | the input is a `number` above `Number.MAX_SAFE_INTEGER`. Pass a `bigint` instead.                                         |
| `TOO_LARGE`         | `RangeError`  | the input is a `bigint` of 10<sup>72</sup> or more, or positional notation longer than 72 digits                          |
| `INVALID_KANJI`     | `SyntaxError` | the input is an empty string or not valid kanji numerals                                                                  |

`isNihonNumbersError` tells these errors apart from any others, so check it before reading `code`:

```typescript
import { isNihonNumbersError, processNumber } from "nihon-numbers";

try {
  processNumber("十十", "toArabic");
} catch (error) {
  if (isNihonNumbersError(error) && error.code === "INVALID_KANJI") {
    console.log(error.message); // Unexpected "十" at index 1 in "十十"
  }
}
```

In TypeScript, `isNihonNumbersError` narrows the error to the `NihonNumbersError` type, and checking `code` narrows it to the matching error type: a `SyntaxError` for `INVALID_KANJI`. The `NihonNumbersErrorCode` type lists every code.

Messages say what was received, such as `Input must not be negative, received -5`. Kanji errors also say where the problem is, counting characters from 0. Text from the input is quoted and escaped as in JSON, and cut to its first 32 characters followed by `…`. A number with more than 72 digits isn't repeated: the message says `received a number with more than 72 digits`.

### Examples

| Input           | `"toAdditive"`                               | `"toPositional"`                           |
| --------------- | -------------------------------------------- | ------------------------------------------ |
| `0`             | 零                                           | 〇                                         |
| `10`            | 十                                           | 一〇                                       |
| `35`            | 三十五                                       | 三五                                       |
| `110`           | 百十                                         | 一一〇                                     |
| `1000`          | 千                                           | 一〇〇〇                                   |
| `3800`          | 三千八百                                     | 三八〇〇                                   |
| `10000`         | 一万                                         | 一〇〇〇〇                                 |
| `11000`         | 一万千                                       | 一一〇〇〇                                 |
| `1801000`       | 百八十万千                                   | 一八〇一〇〇〇                             |
| `130200000`     | 一億三千二十万                               | 一三〇二〇〇〇〇〇                         |
| `9876543290187` | 九兆八千七百六十五億四千三百二十九万百八十七 | 九八七六五四三二九〇一八七                 |
| `10n ** 20n`    | 一垓                                         | 一〇〇〇〇〇〇〇〇〇〇〇〇〇〇〇〇〇〇〇〇 |

| Input            | `"toArabic"`                  |
| ---------------- | ----------------------------- |
| `三千八百`       | `"3800"`                      |
| `一千`           | `"1000"`                      |
| `一億三千二十万` | `"130200000"`                 |
| `二〇二六`       | `"2026"`                      |
| `〇〇五`         | `"5"`                         |
| `零`             | `"0"`                         |
| `一秭`           | `"1000000000000000000000000"` |

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

𥝱 is sometimes written as 秭. `"toArabic"` accepts both, and the other directions write 𥝱.

## Upgrading from 1.1.x

Version 2.0.0 adds the `direction` argument. Calls with one argument give the same results as before, but:

- Passing `processNumber` straight to `map`, `forEach` or another callback now throws `INVALID_DIRECTION`, because they pass the index as the second argument. Use `numbers.map((n) => processNumber(n))` instead.
- Out-of-range input (`NOT_FINITE`, `NEGATIVE`, `UNSAFE_INTEGER` and `TOO_LARGE`) now throws a `RangeError` instead of a `TypeError`. Replace `instanceof TypeError` checks with `isNihonNumbersError(error)`, and check `error.code` for a specific error.
- Error messages are reworded to say what was received. Check `error.code` instead of matching the message text.

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
