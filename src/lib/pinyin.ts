const pinyinCollator = new Intl.Collator("zh-CN-u-co-pinyin", {
  sensitivity: "base",
  numeric: true
});

export function compareByPinyin(left: string, right: string) {
  return pinyinCollator.compare(left.trim(), right.trim());
}
