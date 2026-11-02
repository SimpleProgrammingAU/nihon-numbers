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

/** The characters of each large unit, so 𥝱 counts as one character rather than two UTF-16 code units. */
const LARGE_UNIT_CHARACTERS = LARGE_UNITS.map((unit) => Array.from(unit));

/** The largest supported input, 10^72 - 1. */
const MAX_BIGINT = 10n ** 72n - 1n;

/** The most digits a supported input can have. */
const MAX_DIGITS = 72;

/** Alternative forms that `toArabic` accepts: 秭 for 𥝱, and ○ (a circle often typed instead of 〇) for 〇. */
const ALTERNATIVES = new Map([
  ["秭", "𥝱"],
  ["○", "〇"],
]);

/** Every character that can appear in kanji numerals, including 零 and the alternative forms. */
const KANJI_CHARACTERS = new Set([
  ...Array.from(`${DIGITS}${SMALL_UNITS}${LARGE_UNITS.join("")}零`),
  ...ALTERNATIVES.keys(),
]);

/** The most characters of the input that an error message repeats. */
const QUOTE_LIMIT = 32;

/** Identifies why `processNumber` rejected its arguments. */
type NihonNumbersErrorCode =
  "INVALID_DIRECTION" | "INVALID_TYPE" | "NOT_FINITE" | "NEGATIVE" | "UNSAFE_INTEGER" | "TOO_LARGE" | "INVALID_KANJI";

/** An error thrown by `processNumber`: a built-in error type with a `code` that says what went wrong. */
type NihonNumbersError =
  | (TypeError & { readonly code: "INVALID_DIRECTION" | "INVALID_TYPE" })
  | (RangeError & { readonly code: "NOT_FINITE" | "NEGATIVE" | "UNSAFE_INTEGER" | "TOO_LARGE" })
  | (SyntaxError & { readonly code: "INVALID_KANJI" });

/** The built-in error type thrown for each code. */
const ERROR_TYPES: Record<NihonNumbersErrorCode, ErrorConstructor> = {
  INVALID_DIRECTION: TypeError,
  INVALID_TYPE: TypeError,
  NOT_FINITE: RangeError,
  NEGATIVE: RangeError,
  UNSAFE_INTEGER: RangeError,
  TOO_LARGE: RangeError,
  INVALID_KANJI: SyntaxError,
};

/**
 * Marks the errors this module throws, so `isNihonNumbersError` can tell them apart from other errors with a `code`.
 * `Symbol.for` lets separate copies of the package recognise each other's errors.
 */
const ERROR_BRAND = Symbol.for("nihon-numbers.error");

/**
 * Creates the error for a code, using the built-in error type that matches it.
 * @param code Why the arguments were rejected.
 * @param message What was expected and what was received.
 */
function createError(code: NihonNumbersErrorCode, message: string): Error {
  const error = Object.assign(new ERROR_TYPES[code](message), { code });
  Object.defineProperty(error, ERROR_BRAND, { value: true });
  return error;
}

/**
 * Returns whether a caught value is an error thrown by `processNumber`.
 * @param error The caught value.
 */
function isNihonNumbersError(error: unknown): error is NihonNumbersError {
  return error instanceof Error && ERROR_BRAND in error;
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
 * Quotes part of the input for an error message: at most `QUOTE_LIMIT` characters, with control characters escaped.
 * @param text The text to quote.
 */
function quote(text: string): string {
  // Slicing first keeps this cheap for long input. Two code units per character covers characters such as 𥝱.
  const characters = Array.from(text.slice(0, QUOTE_LIMIT * 2));
  const truncated = characters.length > QUOTE_LIMIT || text.length > QUOTE_LIMIT * 2;
  return JSON.stringify(`${characters.slice(0, QUOTE_LIMIT).join("")}${truncated ? "…" : ""}`);
}

/** Builds the error for an input of 10^72 or more. */
function tooLarge(): Error {
  return createError(
    "TOO_LARGE",
    `Input must be less than 10^72, received a number with more than ${String(MAX_DIGITS)} digits`,
  );
}

/**
 * Validates the input and returns its integer part as a string of decimal digits.
 * @param n Value to validate. Typed as `unknown` because JavaScript callers can pass anything.
 */
function toDigitString(n: unknown): string {
  if (typeof n === "bigint") {
    if (n < 0n) {
      const received = n < -MAX_BIGINT ? `a number with more than ${String(MAX_DIGITS)} digits` : `${String(n)}n`;
      throw createError("NEGATIVE", `Input must not be negative, received ${received}`);
    }
    if (n > MAX_BIGINT) {
      throw tooLarge();
    }
    return n.toString();
  }

  if (typeof n !== "number") {
    throw createError("INVALID_TYPE", `Input must be a number or a bigint, received ${describeType(n)}`);
  }
  if (!Number.isFinite(n)) {
    throw createError("NOT_FINITE", `Input must be finite, received ${String(n)}`);
  }
  if (n < 0) {
    throw createError("NEGATIVE", `Input must not be negative, received ${String(n)}`);
  }
  const integer = Math.floor(n);
  if (integer > Number.MAX_SAFE_INTEGER) {
    throw createError(
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
 * @param characters The input's characters, as written.
 * @param index Position of the character in `characters`.
 */
function unexpectedCharacter(text: string, characters: readonly string[], index: number): Error {
  return createError(
    "INVALID_KANJI",
    `Unexpected ${quote(String(characters[index]))} at index ${String(index)} in ${quote(text)}`,
  );
}

/**
 * Returns the value of the digit 一–九 at an index, or 0 if there isn't one there.
 * 〇, other characters and indexes past the end all give 0, because `DIGITS.indexOf` returns 0 for 〇 and for "",
 * and -1 otherwise.
 * @param characters The input's characters, with alternative forms replaced.
 * @param index Position in `characters`.
 */
function digitAt(characters: readonly string[], index: number): number {
  return Math.max(0, DIGITS.indexOf(characters[index] ?? ""));
}

/**
 * Reads a group in additive notation, such as 千八百一, from an index.
 * 一 is optional before 十, 百 and 千, so both 千 and 一千 are 1000.
 * @param characters The input's characters, with alternative forms replaced.
 * @param index Position in `characters`.
 * @returns The group's value, which is 0 if no group starts there, and the index after it.
 */
function readGroup(characters: readonly string[], index: number): { value: number; end: number } {
  let value = 0;
  let end = index;
  for (let power = 3; power >= 1; power--) {
    const unit = SMALL_UNITS.charAt(power - 1);
    const digit = digitAt(characters, end);
    if (digit > 0 && characters[end + 1] === unit) {
      value += digit * 10 ** power;
      end += 2;
    } else if (characters[end] === unit) {
      value += 10 ** power;
      end += 1;
    }
  }
  const ones = digitAt(characters, end);
  if (ones > 0) {
    value += ones;
    end += 1;
  }
  return { value, end };
}

/**
 * Reads a large unit, such as 万 or 不可思議, from an index.
 * @param characters The input's characters, with alternative forms replaced.
 * @param index Position in `characters`.
 * @returns The unit's index in `LARGE_UNITS` and its length in characters, or `undefined` if no large unit starts there.
 */
function readLargeUnit(characters: readonly string[], index: number): { unit: number; length: number } | undefined {
  for (const [unit, unitCharacters] of LARGE_UNIT_CHARACTERS.entries()) {
    if (unit > 0 && unitCharacters.every((character, offset) => characters[index + offset] === character)) {
      return { unit, length: unitCharacters.length };
    }
  }
  return undefined;
}

/**
 * Converts positional notation, such as 二〇二六, into Arabic numerals.
 * @param characters The input's characters, all digits, with alternative forms replaced.
 */
function fromPositional(characters: readonly string[]): string {
  const digits = characters
    .map((character) => String(DIGITS.indexOf(character)))
    .join("")
    .replace(/^0+(?=\d)/, "");
  if (digits.length > MAX_DIGITS) {
    throw tooLarge();
  }
  return digits;
}

/**
 * Converts additive notation, such as 一億三千二十万, into Arabic numerals.
 * @param text The whole input.
 * @param written The input's characters, as written.
 * @param characters The input's characters, with alternative forms replaced.
 */
function fromAdditive(text: string, written: readonly string[], characters: readonly string[]): string {
  let total = 0n;
  // Large units go from largest to smallest, so each must have a lower index than the one before it.
  let previous: { unit: number; text: string } = { unit: LARGE_UNITS.length, text: "" };
  let index = 0;
  while (index < characters.length) {
    const group = readGroup(characters, index);
    const largeUnit = readLargeUnit(characters, group.end);
    if (largeUnit === undefined) {
      if (group.end < characters.length) {
        throw unexpectedCharacter(text, written, group.end);
      }
      total += BigInt(group.value);
      break;
    }
    const unitText = written.slice(group.end, group.end + largeUnit.length).join("");
    if (group.value === 0) {
      throw createError("INVALID_KANJI", `${quote(unitText)} needs a number before it in ${quote(text)}`);
    }
    if (largeUnit.unit >= previous.unit) {
      throw createError("INVALID_KANJI", `${quote(unitText)} cannot follow ${quote(previous.text)} in ${quote(text)}`);
    }
    total += BigInt(group.value) * 10n ** BigInt(4 * largeUnit.unit);
    previous = { unit: largeUnit.unit, text: unitText };
    index = group.end + largeUnit.length;
  }
  return total.toString();
}

/**
 * Converts kanji numerals in additive or positional notation into Arabic numerals.
 * @param text Value to convert. Typed as `unknown` because JavaScript callers can pass anything.
 */
function toArabic(text: unknown): string {
  if (typeof text !== "string") {
    throw createError("INVALID_TYPE", `Input must be a string of kanji numerals, received ${describeType(text)}`);
  }
  if (text === "") {
    throw createError("INVALID_KANJI", "Input must not be empty");
  }
  const written = Array.from(text);
  for (const [index, character] of written.entries()) {
    if (!KANJI_CHARACTERS.has(character)) {
      throw unexpectedCharacter(text, written, index);
    }
  }
  if (text === "零") {
    return "0";
  }
  const characters = written.map((character) => ALTERNATIVES.get(character) ?? character);
  if (characters.every((character) => DIGITS.includes(character))) {
    return fromPositional(characters);
  }
  return fromAdditive(text, written, characters);
}

/**
 * Converts kanji numerals into Arabic numerals.
 * @param n Kanji numerals in additive notation, such as 二千二十六, or positional notation, such as 二〇二六.
 * @param direction `"toArabic"`.
 * @returns The number as a string of Arabic numerals without leading zeros, such as "2026".
 * Pass it to `Number()` or `BigInt()` to do arithmetic with it.
 * @throws {TypeError} `INVALID_TYPE` if the input is not a string.
 * @throws {SyntaxError} `INVALID_KANJI` if the input is not valid kanji numerals.
 * @throws {RangeError} `TOO_LARGE` if the input is positional notation of 10^72 or more.
 */
function processNumber(n: string, direction: "toArabic"): string;
/**
 * Converts a non-negative integer into kanji numerals.
 * @param n The number to convert. A `number` is rounded down and must not exceed `Number.MAX_SAFE_INTEGER`.
 * Pass a `bigint` for larger values, up to 10^72 - 1.
 * @param direction `"toAdditive"` (the default) writes additive notation, such as 二千二十六 for 2026.
 * `"toPositional"` writes positional notation, one kanji digit per decimal place, such as 二〇二六. Use it to practise
 * reading kanji digits: Japanese writes few numbers this way, mainly years and phone numbers in vertical text.
 * @returns The number in kanji numerals.
 * @throws {TypeError} `INVALID_TYPE` if the input is not a number or a bigint, or `INVALID_DIRECTION` if the direction
 * is not recognised.
 * @throws {RangeError} `NOT_FINITE`, `NEGATIVE`, `UNSAFE_INTEGER` or `TOO_LARGE` if the input is out of range.
 */
function processNumber(n: number | bigint, direction?: "toAdditive" | "toPositional"): string;
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
  const received = typeof direction === "string" ? quote(direction) : describeType(direction);
  throw createError(
    "INVALID_DIRECTION",
    `Direction must be "toAdditive", "toPositional" or "toArabic", received ${received}`,
  );
}

export { processNumber, isNihonNumbersError };
export type { NihonNumbersError, NihonNumbersErrorCode };
export default processNumber;
