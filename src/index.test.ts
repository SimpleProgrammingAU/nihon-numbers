import { strict as assert } from "node:assert";
import processNumberDefault, { NihonNumbersError, processNumber, type NihonNumbersErrorCode } from "./index.js";

/** The largest supported input, 10^72 - 1. */
const MAX_BIGINT = 10n ** 72n - 1n;

function assertConverts(cases: readonly (readonly [number | bigint, string])[]): void {
  for (const [input, expected] of cases) {
    assert.equal(processNumber(input), expected, `processNumber(${String(input)})`);
  }
}

/** Asserts that `fn` throws a NihonNumbersError, which is also a TypeError, with the given code and, optionally, message. */
function assertThrowsCode(fn: () => unknown, code: NihonNumbersErrorCode, message?: string): void {
  let thrown: unknown;
  try {
    fn();
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof NihonNumbersError, `expected a NihonNumbersError with code ${code}`);
  assert.ok(thrown instanceof TypeError);
  assert.equal(thrown.code, code);
  if (message !== undefined) {
    assert.equal(thrown.message, message);
  }
}

suite("processNumber()", () => {
  test("is both the default and a named export", () => {
    assert.equal(processNumberDefault, processNumber);
  });

  test("converts single digits", () => {
    assertConverts([
      [1, "一"],
      [5, "五"],
      [9, "九"],
    ]);
  });

  test("omits 一 before 十, 百 and 千", () => {
    assertConverts([
      [10, "十"],
      [11, "十一"],
      [35, "三十五"],
      [110, "百十"],
      [180, "百八十"],
      [1000, "千"],
      [1100, "千百"],
      [3800, "三千八百"],
      [9999, "九千九百九十九"],
    ]);
  });

  test("keeps 一 before 万 and larger units", () => {
    assertConverts([
      [10000, "一万"],
      [11000, "一万千"],
      [10000000, "千万"],
      [1801000, "百八十万千"],
      [100010001, "一億一万一"],
      [130200000, "一億三千二十万"],
      [9876543290187, "九兆八千七百六十五億四千三百二十九万百八十七"],
    ]);
  });

  test("converts zero to 零", () => {
    assertConverts([
      [0, "零"],
      [-0, "零"],
      [0.5, "零"],
      [1e-7, "零"],
      [0n, "零"],
    ]);
  });

  test("rounds fractions down", () => {
    assertConverts([
      [10.5, "十"],
      [3800.99, "三千八百"],
    ]);
  });

  test("converts Number.MAX_SAFE_INTEGER exactly", () => {
    assertConverts([[Number.MAX_SAFE_INTEGER, "九千七兆千九百九十二億五千四百七十四万九百九十一"]]);
  });

  test("converts bigints", () => {
    assertConverts([
      [1n, "一"],
      [10000n, "一万"],
      [10n ** 16n, "一京"],
      [10n ** 20n, "一垓"],
      [10n ** 24n, "一𥝱"],
      [10n ** 68n, "一無量大数"],
      [12345678901234567890n, "千二百三十四京五千六百七十八兆九千十二億三千四百五十六万七千八百九十"],
    ]);
    assert.equal(processNumber(123456789n), processNumber(123456789));
  });

  test("converts the largest supported bigint", () => {
    const units = "無量大数 不可思議 那由他 阿僧祇 恒河沙 極 載 正 澗 溝 穣 𥝱 垓 京 兆 億 万".split(" ");
    const expected = [...units, ""].map((unit) => `九千九百九十九${unit}`).join("");
    assert.equal(processNumber(MAX_BIGINT), expected);
  });

  test("throws INVALID_TYPE for inputs that are not numbers or bigints", () => {
    const invalid: unknown[] = ["123", "a", "12B456", "%*/+-", [5], {}, null, undefined, true, Symbol("1")];
    for (const input of invalid) {
      assertThrowsCode(() => processNumber(input as number), "INVALID_TYPE");
    }
    const message = "Input must be a number or a bigint, received";
    assertThrowsCode(() => processNumber("123" as unknown as number), "INVALID_TYPE", `${message} string`);
    assertThrowsCode(() => processNumber(null as unknown as number), "INVALID_TYPE", `${message} null`);
    assertThrowsCode(() => processNumber([5] as unknown as number), "INVALID_TYPE", `${message} array`);
    assertThrowsCode(() => processNumber(Symbol("1") as unknown as number), "INVALID_TYPE", `${message} symbol`);
  });

  test("throws NOT_FINITE for non-finite numbers", () => {
    for (const input of [NaN, Infinity, -Infinity]) {
      assertThrowsCode(() => processNumber(input), "NOT_FINITE", `Input must be finite, received ${String(input)}`);
    }
  });

  test("throws NEGATIVE for negative inputs", () => {
    assertThrowsCode(() => processNumber(-5), "NEGATIVE", "Input must not be negative, received -5");
    assertThrowsCode(() => processNumber(-0.5), "NEGATIVE", "Input must not be negative, received -0.5");
    assertThrowsCode(() => processNumber(-1n), "NEGATIVE", "Input must not be negative, received -1n");
  });

  test("throws UNSAFE_INTEGER for numbers above Number.MAX_SAFE_INTEGER", () => {
    assertThrowsCode(
      () => processNumber(2 ** 53),
      "UNSAFE_INTEGER",
      "Input must not exceed Number.MAX_SAFE_INTEGER, received 9007199254740992; pass a bigint for larger values",
    );
    assertThrowsCode(() => processNumber(1e21), "UNSAFE_INTEGER");
  });

  test("throws TOO_LARGE for bigints of 10^72 or more", () => {
    assertThrowsCode(
      () => processNumber(MAX_BIGINT + 1n),
      "TOO_LARGE",
      "Input must be less than 10^72, received a 73-digit number",
    );
  });

  test("names its errors NihonNumbersError", () => {
    assert.throws(() => processNumber(-1), { name: "NihonNumbersError" });
  });

  test('treats an explicit "toAdditive" like the default', () => {
    for (const input of [0, 10, 3800, 10.5, 130200000, Number.MAX_SAFE_INTEGER, 10n ** 20n, MAX_BIGINT]) {
      assert.equal(processNumber(input, "toAdditive"), processNumber(input), `processNumber(${String(input)})`);
    }
  });

  test("throws INVALID_DIRECTION for unknown directions", () => {
    const message = 'Direction must be "toAdditive" or "toPositional", received';
    assertThrowsCode(() => processNumber(1, "toKanji" as "toAdditive"), "INVALID_DIRECTION", `${message} "toKanji"`);
    assertThrowsCode(() => processNumber(1, 1 as unknown as "toAdditive"), "INVALID_DIRECTION", `${message} number`);
    assertThrowsCode(() => processNumber(1, null as unknown as "toAdditive"), "INVALID_DIRECTION", `${message} null`);
  });

  test("never writes to the console", () => {
    const calls: unknown[] = [];
    // eslint-disable-next-line no-console -- saves the real methods so they can be restored after stubbing
    const original = { log: console.log, warn: console.warn, error: console.error };
    const record = (...args: unknown[]): void => {
      calls.push(args);
    };
    Object.assign(console, { log: record, warn: record, error: record });
    try {
      processNumber(10.5);
      processNumber(0.5);
      processNumber(10.5, "toPositional");
    } finally {
      Object.assign(console, original);
    }
    assert.deepEqual(calls, []);
  });
});

suite('processNumber(…, "toPositional")', () => {
  function assertConvertsPositional(cases: readonly (readonly [number | bigint, string])[]): void {
    for (const [input, expected] of cases) {
      assert.equal(processNumber(input, "toPositional"), expected, `processNumber(${String(input)}, "toPositional")`);
    }
  }

  test("writes one kanji digit per decimal place", () => {
    assertConvertsPositional([
      [7, "七"],
      [10, "一〇"],
      [35, "三五"],
      [2026, "二〇二六"],
      [2005, "二〇〇五"],
      [10000, "一〇〇〇〇"],
    ]);
  });

  test("writes zero as 〇", () => {
    assertConvertsPositional([
      [0, "〇"],
      [0.5, "〇"],
      [0n, "〇"],
    ]);
  });

  test("rounds fractions down", () => {
    assertConvertsPositional([[10.9, "一〇"]]);
  });

  test("converts the largest supported number and bigint", () => {
    assertConvertsPositional([
      [Number.MAX_SAFE_INTEGER, "九〇〇七一九九二五四七四〇九九一"],
      [10n ** 71n, `一${"〇".repeat(71)}`],
      [MAX_BIGINT, "九".repeat(72)],
    ]);
  });

  test("rejects the same inputs as additive notation", () => {
    assertThrowsCode(() => processNumber("5" as unknown as number, "toPositional"), "INVALID_TYPE");
    assertThrowsCode(() => processNumber(NaN, "toPositional"), "NOT_FINITE");
    assertThrowsCode(() => processNumber(-1, "toPositional"), "NEGATIVE");
    assertThrowsCode(() => processNumber(2 ** 53, "toPositional"), "UNSAFE_INTEGER");
    assertThrowsCode(() => processNumber(MAX_BIGINT + 1n, "toPositional"), "TOO_LARGE");
  });
});
