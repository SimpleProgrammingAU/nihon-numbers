/**
 * Converts arabic integers into Japanese characters.
 * @param n Input number for conversion to Japanese
 */
export default (n: number): string => {
  const scalar = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  const magnitude = [
    { order: 0, char: "" },
    { order: 1, char: "十" },
    { order: 2, char: "百" },
    { order: 3, char: "千" },
    { order: 4, char: "万" },
    { order: 8, char: "億" },
    { order: 12, char: "兆" },
    { order: 16, char: "京" },
  ].reverse();

  /**
   * 
   * @param n 
   */
  const processNumber = (n: number): string => {
    if (n.toString().search(/^(-)?[0-9]+(\.[0-9]+)?$/g) === -1) throw new TypeError("Input must be of type number");
    if (n <= 0) throw new TypeError("Input number must be positive");
    if (n % 1 !== 0) console.warn(`Input number will be rounded down to nearest integer value: ${Math.floor(n)}`);

    let result = "";
    let remainder = Math.floor(n);

    magnitude.forEach((m) => {
      const sigNumber = Math.floor(remainder / 10 ** m.order);
      if (sigNumber >= 1) {
        const sigNumberStr = sigNumber < 10 ? scalar[sigNumber] : processNumber(sigNumber);
        result += sigNumberStr + m.char;
        remainder -= sigNumber * 10 ** m.order;
      }
    });

    return result.replace("一十", "十").replace("一百", "百");
  };

  return processNumber(n);
};
