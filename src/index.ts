/** Kanji digits 0–9. Additive notation skips zero digits; positional notation writes them as 〇. */
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

/** Identifies why `processNumber` rejected its arguments. */
type NihonNumbersErrorCode =
  "INVALID_DIRECTION" | "INVALID_TYPE" | "NOT_FINITE" | "NEGATIVE" | "UNSAFE_INTEGER" | "TOO_LARGE" | "INVALID_KANJI";

/**
 * Thrown by `processNumber` for invalid arguments. It extends `TypeError`, so code that catches `TypeError` still works.
 */
class NihonNumbersError extends TypeError {
  /** Why the arguments were rejected. */
  readonly code: NihonNumbersErrorCode;

  constructor(code: NihonNumbersErrorCode, message: string) {
    super(message);
    this.name = "NihonNumbersError";
    this.code = code;
  }
}

/**
 * Names the type of a rejected value for an error message, without printing the value itself.
 * @param value The rejected value.
 */
function describeType(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  return typeof value;
}

/**
 * Validates the input and returns its integer part as a string of decimal digits.
 * @param n Value to validate. Typed as `unknown` because JavaScript callers can pass anything.
 */
function toDigitString(n: unknown): string {
  if (typeof n === "bigint") {
    if (n < 0n) {
      throw new NihonNumbersError("NEGATIVE", `Input must not be negative, received ${String(n)}n`);
    }
    if (n > MAX_BIGINT) {
      throw new NihonNumbersError(
        "TOO_LARGE",
        `Input must be less than 10^72, received a ${String(n.toString().length)}-digit number`,
      );
    }
    return n.toString();
  }

  if (typeof n !== "number") {
    throw new NihonNumbersError("INVALID_TYPE", `Input must be a number or a bigint, received ${describeType(n)}`);
  }
  if (!Number.isFinite(n)) {
    throw new NihonNumbersError("NOT_FINITE", `Input must be finite, received ${String(n)}`);
  }
  if (n < 0) {
    throw new NihonNumbersError("NEGATIVE", `Input must not be negative, received ${String(n)}`);
  }
  const integer = Math.floor(n);
  if (integer > Number.MAX_SAFE_INTEGER) {
    throw new NihonNumbersError(
      "UNSAFE_INTEGER",
      `Input must not exceed Number.MAX_SAFE_INTEGER, received ${String(n)}; pass a bigint for larger values`,
    );
  }
  return String(integer);
}

/**
 * Converts a group of up to four digits, such as "1801", into additive notation (千八百一).
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
 * Converts a non-negative integer into additive notation, such as 三千八百 for 3800.
 * @param n Value to convert. Typed as `unknown` because JavaScript callers can pass anything.
 */
function toAdditive(n: unknown): string {
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

/**
 * Converts a non-negative integer into positional notation, such as 二〇二六 for 2026.
 * @param n Value to convert. Typed as `unknown` because JavaScript callers can pass anything.
 */
function toPositional(n: unknown): string {
  return toDigitString(n).replace(/\d/g, (digit) => DIGITS.charAt(Number(digit)));
}

/**
 * Converts a non-negative integer into kanji numerals.
 * @param n The number to convert. A `number` is rounded down and must not exceed `Number.MAX_SAFE_INTEGER`.
 * Pass a `bigint` for larger values, up to 10^72 - 1.
 * @param direction `"toAdditive"` (the default) writes additive notation, such as 二千二十六 for 2026.
 * `"toPositional"` writes positional notation, such as 二〇二六.
 * @returns The number in kanji numerals.
 * @throws {NihonNumbersError} If the input is not a finite number or a bigint, is negative, or is too large,
 * or if the direction is not recognised.
 */
function processNumber(n: number | bigint, direction?: "toAdditive" | "toPositional"): string;
function processNumber(n: unknown, direction: unknown = "toAdditive"): string {
  if (direction === "toAdditive") {
    return toAdditive(n);
  }
  if (direction === "toPositional") {
    return toPositional(n);
  }
  const received = typeof direction === "string" ? `"${direction}"` : describeType(direction);
  throw new NihonNumbersError(
    "INVALID_DIRECTION",
    `Direction must be "toAdditive" or "toPositional", received ${received}`,
  );
}

export { processNumber, NihonNumbersError, type NihonNumbersErrorCode };
export default processNumber;
