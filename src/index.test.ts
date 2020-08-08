import { strict as assert } from "assert";
import { default as processNumber } from "./";

test("processNumber()", () => {
  assert.strictEqual(processNumber(1), "一");
  assert.strictEqual(processNumber(10), "十");
  assert.strictEqual(processNumber(10.5), "十");
  assert.strictEqual(processNumber(35), "三十五");
  assert.strictEqual(processNumber(180), "百八十");
  assert.strictEqual(processNumber(1801000), "百八十万一千");
  assert.strictEqual(processNumber(130200000), "一億三千二十万");
  assert.strictEqual(processNumber(9876543290187), "九兆八千七百六十五億四千三百二十九万百八十七");
  assert.throws(() => {
    processNumber((("a") as unknown) as number);
  });
  assert.throws(() => {
    processNumber((("12B456") as unknown) as number);
  });
  assert.throws(() => {
    processNumber((("%*/+-") as unknown) as number);
  });
});
