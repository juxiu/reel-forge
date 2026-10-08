function detectLanguage(words) {
  const sample = words.map((word) => word.text).join("");
  const cjk = [...sample].filter((char) => /[\u3400-\u9fff]/u.test(char)).length;
  return cjk >= Math.max(1, sample.length * 0.2) ? "zh" : "en";
}

function formatCaption(words, language) {
  const text = language === "zh" ? words.join("") : words.join(" ");
  return text.replace(/\s+/g, language === "zh" ? "" : " ").trim();
}

export function captionsFromWords(
  words,
  {
    language = "auto",
    maxTokens = 8,
    maxDuration = 2.5,
    maxCharsZh = 16,
    maxCharsEn = 48,
  } = {},
) {
  if (!Array.isArray(words) || !words.length) {
    throw new Error("empty word timing");
  }

  const lang = language === "auto" ? detectLanguage(words) : language;
  const captions = [];
  let start = Number(words[0].start);
  let group = [];

  const flush = (end) => {
    if (!group.length) return;
    const text = formatCaption(group, lang);
    if (text) {
      captions.push({
        id: "cap-" + String(captions.length + 1).padStart(3, "0"),
        text,
        start,
        end,
      });
    }
    group = [];
    start = end;
  };

  for (const word of words) {
    const next = [...group, word.text];
    const joined = formatCaption(next, lang);
    const tooManyTokens = next.length >= maxTokens;
    const tooLong = lang === "zh"
      ? [...joined].length > maxCharsZh
      : joined.length > maxCharsEn;
    const tooSlow = Number(word.end) - start >= maxDuration;
    const sentenceEnd = /[.!?。！？；]$/.test(word.text);

    if (group.length && (tooManyTokens || tooLong || tooSlow)) {
      const previousEnd = group.at(-1)?.end ?? word.start;
      flush(Number(previousEnd));
    }

    group.push(word.text);
    if (sentenceEnd) {
      flush(Number(word.end));
    }
  }

  flush(Number(words.at(-1).end));

  for (const caption of captions) {
    if (!(caption.end > caption.start)) {
      throw new Error("invalid caption timing");
    }
  }

  return {captions, language: lang};
}
