import { strict as assert } from "node:assert";
import processNumberDefault, { processNumber } from "./index.js";

/** The largest supported input, 10^72 - 1. */
const MAX_BIGINT = 10n ** 72n - 1n;

function assertConverts(cases: readonly (readonly [number | bigint, string])[]): void {
  for (const [input, expected] of cases) {
    assert.equal(processNumber(input), expected, `processNumber(${String(input)})`);
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

  test("throws TypeError for inputs that are not numbers or bigints", () => {
    const invalid: unknown[] = ["123", "a", "12B456", "%*/+-", [5], {}, null, undefined, true, Symbol("1")];
    for (const input of invalid) {
      assert.throws(() => processNumber(input as number), TypeError, `processNumber(${typeof input})`);
    }
  });

  test("throws TypeError for non-finite numbers", () => {
    for (const input of [NaN, Infinity, -Infinity]) {
      assert.throws(() => processNumber(input), TypeError, `processNumber(${String(input)})`);
    }
  });

  test("throws TypeError for negative inputs", () => {
    for (const input of [-5, -0.5, -1n]) {
      assert.throws(() => processNumber(input), TypeError, `processNumber(${String(input)})`);
    }
  });

  test("throws TypeError for numbers above Number.MAX_SAFE_INTEGER", () => {
    for (const input of [Number.MAX_SAFE_INTEGER + 2, 1e21]) {
      assert.throws(() => processNumber(input), { name: "TypeError", message: /pass a bigint/ });
    }
  });

  test("throws TypeError for bigints of 10^72 or more", () => {
    assert.throws(() => processNumber(MAX_BIGINT + 1n), TypeError);
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
    } finally {
      Object.assign(console, original);
    }
    assert.deepEqual(calls, []);
  });
});
