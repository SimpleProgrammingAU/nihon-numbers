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

  const processNumber = (n: number): string => {
    if (n.toString().search(/^[0-9]+$/g) === -1) throw new TypeError("Input must be of type number");

    let result = "";
    let remainder = n;

    magnitude.forEach((m) => {
      const sigNumber = Math.floor(remainder / 10 ** m.order);
      if (sigNumber >= 1) {
        const sigNumberStr = sigNumber < 10 ? scalar[sigNumber] : processNumber(sigNumber);
        result += sigNumberStr + m.char;
        remainder -= sigNumber * 10 ** m.order;
      }
    });
    return result;
  };

  return processNumber(n);
};
