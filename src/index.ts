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

/** 秭, an alternative form of 𥝱 that `toArabic` accepts. */
const ALTERNATIVE_JO = "秭";

/** Every character that can appear in kanji numerals, including 零 and 秭. */
const KANJI_CHARACTERS = new Set(Array.from(`${DIGITS}${SMALL_UNITS}${LARGE_UNITS.join("")}零${ALTERNATIVE_JO}`));

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
 * Throws if a value is beyond the supported range.
 * @param value A non-negative value to check.
 */
function assertWithinLimit(value: bigint): void {
  if (value > MAX_BIGINT) {
    throw new NihonNumbersError(
      "TOO_LARGE",
      `Input must be less than 10^72, received a ${String(value.toString().length)}-digit number`,
    );
  }
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
    assertWithinLimit(n);
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
 * Builds the error for a character that can't appear where it is.
 * @param text The whole input.
 * @param index Position of the character, counted in characters rather than UTF-16 code units, so 𥝱 counts as one.
 */
function unexpectedCharacter(text: string, index: number): NihonNumbersError {
  const character = String(Array.from(text)[index]);
  return new NihonNumbersError("INVALID_KANJI", `Unexpected "${character}" at index ${String(index)} in "${text}"`);
}

/**
 * Returns the value of the digit 一–九 at a position, or 0 if there isn't one there.
 * 〇, other characters and positions past the end all give 0, because `DIGITS.indexOf` returns 0 for 〇 and for "",
 * and -1 otherwise.
 * @param text The whole input.
 * @param position Position in UTF-16 code units.
 */
function digitAt(text: string, position: number): number {
  return Math.max(0, DIGITS.indexOf(text.charAt(position)));
}

/**
 * Reads a group in additive notation, such as 千八百一, from a position.
 * 一 is optional before 十, 百 and 千, so both 千 and 一千 are 1000.
 * @param text The whole input.
 * @param position Position in UTF-16 code units.
 * @returns The group's value, which is 0 if no group starts there, and the position after it.
 */
function readGroup(text: string, position: number): { value: number; end: number } {
  let value = 0;
  let end = position;
  for (let power = 3; power >= 1; power--) {
    const unit = SMALL_UNITS.charAt(power - 1);
    const digit = digitAt(text, end);
    if (digit > 0 && text.charAt(end + 1) === unit) {
      value += digit * 10 ** power;
      end += 2;
    } else if (text.charAt(end) === unit) {
      value += 10 ** power;
      end += 1;
    }
  }
  const ones = digitAt(text, end);
  if (ones > 0) {
    value += ones;
    end += 1;
  }
  return { value, end };
}

/**
 * Reads a large unit, such as 万 or 不可思議, from a position.
 * @param text The whole input.
 * @param position Position in UTF-16 code units.
 * @returns The unit's index in `LARGE_UNITS` and its text as written, or `undefined` if no large unit starts there.
 */
function readLargeUnit(text: string, position: number): { index: number; text: string } | undefined {
  if (text.startsWith(ALTERNATIVE_JO, position)) {
    return { index: LARGE_UNITS.indexOf("𥝱"), text: ALTERNATIVE_JO };
  }
  for (const [index, unit] of LARGE_UNITS.entries()) {
    if (index > 0 && text.startsWith(unit, position)) {
      return { index, text: unit };
    }
  }
  return undefined;
}

/**
 * Converts positional notation, such as 二〇二六, into Arabic numerals.
 * @param text Kanji digits only.
 */
function fromPositional(text: string): string {
  const value = BigInt(text.replace(/[〇一二三四五六七八九]/g, (digit) => String(DIGITS.indexOf(digit))));
  assertWithinLimit(value);
  return value.toString();
}

/**
 * Converts additive notation, such as 一億三千二十万, into Arabic numerals.
 * @param text Kanji numeral characters only.
 */
function fromAdditive(text: string): string {
  let total = 0n;
  // Large units go from largest to smallest, so each must have a lower index than the one before it.
  let previous: { index: number; text: string } = { index: LARGE_UNITS.length, text: "" };
  let position = 0;
  while (position < text.length) {
    const group = readGroup(text, position);
    const unit = readLargeUnit(text, group.end);
    if (unit === undefined) {
      if (group.end < text.length) {
        throw unexpectedCharacter(text, Array.from(text.slice(0, group.end)).length);
      }
      total += BigInt(group.value);
      break;
    }
    if (group.value === 0) {
      throw new NihonNumbersError("INVALID_KANJI", `"${unit.text}" needs a number before it in "${text}"`);
    }
    if (unit.index >= previous.index) {
      throw new NihonNumbersError("INVALID_KANJI", `"${unit.text}" cannot follow "${previous.text}" in "${text}"`);
    }
    total += BigInt(group.value) * 10n ** BigInt(4 * unit.index);
    previous = unit;
    position = group.end + unit.text.length;
  }
  return total.toString();
}

/**
 * Converts kanji numerals in additive or positional notation into Arabic numerals.
 * @param text Value to convert. Typed as `unknown` because JavaScript callers can pass anything.
 */
function toArabic(text: unknown): string {
  if (typeof text !== "string") {
    throw new NihonNumbersError(
      "INVALID_TYPE",
      `Input must be a string of kanji numerals, received ${describeType(text)}`,
    );
  }
  if (text === "") {
    throw new NihonNumbersError("INVALID_KANJI", "Input must not be empty");
  }
  for (const [index, character] of Array.from(text).entries()) {
    if (!KANJI_CHARACTERS.has(character)) {
      throw unexpectedCharacter(text, index);
    }
  }
  if (text === "零") {
    return "0";
  }
  if (/^[〇一二三四五六七八九]+$/.test(text)) {
    return fromPositional(text);
  }
  return fromAdditive(text);
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
/**
 * Converts kanji numerals into Arabic numerals.
 * @param n Kanji numerals in additive notation, such as 二千二十六, or positional notation, such as 二〇二六.
 * @param direction `"toArabic"`.
 * @returns The number as a string of Arabic numerals without leading zeros, such as "2026".
 * Pass it to `Number()` or `BigInt()` to do arithmetic with it.
 * @throws {NihonNumbersError} If the input is not a string or is not valid kanji numerals.
 */
function processNumber(n: string, direction: "toArabic"): string;
function processNumber(n: unknown, direction: unknown = "toAdditive"): string {
  if (direction === "toAdditive") {
    return toAdditive(n);
  }
  if (direction === "toPositional") {
    return toPositional(n);
  }
  if (direction === "toArabic") {
    return toArabic(n);
  }
  const received = typeof direction === "string" ? `"${direction}"` : describeType(direction);
  throw new NihonNumbersError(
    "INVALID_DIRECTION",
    `Direction must be "toAdditive", "toPositional" or "toArabic", received ${received}`,
  );
}

export { processNumber, NihonNumbersError, type NihonNumbersErrorCode };
export default processNumber;
