/** Japanese numerals for the digits 0–9. Index 0 is never output because zero digits are skipped. */
const DIGITS = "〇一二三四五六七八九";

/** Units within a four-digit group: 十 (10), 百 (100) and 千 (1,000). */
const SMALL_UNITS = "十百千";

/** Units for each four-digit group, from the ones group up to 無量大数 (10^68). */
const LARGE_UNITS = [
  "",
  "万",
  "億",
  "兆",
  "京",
  "垓",
  "𥝱",
  "穣",
  "溝",
  "澗",
  "正",
  "載",
  "極",
  "恒河沙",
  "阿僧祇",
  "那由他",
  "不可思議",
  "無量大数",
] as const;

/** The largest supported input, 10^72 - 1. */
const MAX_BIGINT = 10n ** 72n - 1n;

/**
 * Validates the input and returns its integer part as a string of decimal digits.
 * @param n Value to validate. Typed as `unknown` because JavaScript callers can pass anything.
 */
function toDigitString(n: unknown): string {
  if (typeof n === "bigint") {
    if (n < 0n) {
      throw new TypeError("Input must not be negative");
    }
    if (n > MAX_BIGINT) {
      throw new TypeError("Input must be less than 10^72");
    }
    return n.toString();
  }

  if (typeof n !== "number" || !Number.isFinite(n)) {
    throw new TypeError("Input must be a finite number or a bigint");
  }
  if (n < 0) {
    throw new TypeError("Input must not be negative");
  }
  const integer = Math.floor(n);
  if (integer > Number.MAX_SAFE_INTEGER) {
    throw new TypeError("Input must not exceed Number.MAX_SAFE_INTEGER; pass a bigint for larger values");
  }
  return String(integer);
}

/**
 * Converts a group of up to four digits, such as "1801", into Japanese numerals (千八百一).
 * @param group Digits of the group, most significant first.
 */
function convertGroup(group: string): string {
  let result = "";
  for (let index = 0; index < group.length; index++) {
    const digit = Number(group.charAt(index));
    if (digit === 0) {
      continue;
    }
    const position = group.length - 1 - index;
    const unit = position === 0 ? "" : SMALL_UNITS.charAt(position - 1);
    // 一 is omitted before 十, 百 and 千: 10 is 十, not 一十.
    result += (digit === 1 && unit !== "" ? "" : DIGITS.charAt(digit)) + unit;
  }
  return result;
}

/**
 * Converts a non-negative integer into Japanese numerals.
 * @param n The number to convert. A `number` is rounded down and must not exceed `Number.MAX_SAFE_INTEGER`.
 * Pass a `bigint` for larger values, up to 10^72 - 1.
 * @returns The number in Japanese numerals, for example 三千八百 for 3800.
 * @throws {TypeError} If the input is not a finite number or a bigint, is negative, or is too large.
 */
function processNumber(n: number | bigint): string {
  const digits = toDigitString(n);
  if (digits === "0") {
    return "零";
  }

  let result = "";
  for (const [index, unit] of LARGE_UNITS.entries()) {
    const end = digits.length - index * 4;
    if (end <= 0) {
      break;
    }
    const group = convertGroup(digits.slice(Math.max(0, end - 4), end));
    if (group !== "") {
      result = group + unit + result;
    }
  }
  return result;
}

export { processNumber };
export default processNumber;
