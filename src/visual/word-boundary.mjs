function sentenceWindow(sentence, fps) {
  const from = (Number(sentence.from) - 1) / fps;
  const to = Number(sentence.to) / fps;
  return {from, to};
}

function validWord(word) {
  const start = Number(word?.start);
  const end = Number(word?.end);
  return Number.isFinite(start) && Number.isFinite(end) && end > start;
}

export function deriveWordBoundarySegments(timeline, words) {
  if (!timeline || !Array.isArray(timeline.sentences)) throw new Error("timeline sentences missing");
  if (!Array.isArray(words) || !words.length) throw new Error("word boundary source missing");
  const fps = Number(timeline.fps || 30);
  return timeline.sentences.map((sentence) => {
    const {from, to} = sentenceWindow(sentence, fps);
    const sentenceWords = words.filter((word) => {
      if (!validWord(word)) return false;
      return Number(word.end) > from && Number(word.start) < to;
    });
    if (!sentenceWords.length) throw new Error("no word boundaries for sentence " + sentence.id);
    return {
      id: sentence.id,
      text: sentence.text,
      start: Number(sentenceWords[0].start),
      end: Number(sentenceWords.at(-1).end),
      words: sentenceWords,
    };
  });
}

export function lintWordBoundaryTimeline(timeline, words, {maxDriftFrames = 2} = {}) {
  const issues = [];
  if (!timeline || !Array.isArray(timeline.sentences)) return ["word-boundary:timeline-missing"];
  if (!Array.isArray(words) || !words.length) return ["word-boundary:missing-source"];
  const fps = Number(timeline.fps || 30);
  let previousEnd = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!validWord(word)) { issues.push("word-boundary:invalid-word-" + i); continue; }
    const start = Number(word.start);
    const end = Number(word.end);
    if (i > 0 && start < previousEnd - 0.01) issues.push("word-boundary:non-monotonic-" + i);
    previousEnd = end;
  }

  for (const sentence of timeline.sentences) {
    const {from, to} = sentenceWindow(sentence, fps);
    const sentenceWords = words.filter((word) => validWord(word) && Number(word.end) > from && Number(word.start) < to);
    if (!sentenceWords.length) { issues.push(sentence.id + ":no-word-boundary-coverage"); continue; }
    const firstStart = Number(sentenceWords[0].start);
    const lastEnd = Number(sentenceWords.at(-1).end);
    if (Math.abs(firstStart - from) * fps > maxDriftFrames) issues.push(sentence.id + ":word-start-drift");
    if (Math.abs(lastEnd - to) * fps > maxDriftFrames) issues.push(sentence.id + ":word-end-drift");
    for (const sub of sentence.subs || []) {
      if (!(Number(sub.to) >= Number(sub.from))) issues.push(sentence.id + ":invalid-subtitle-timing");
      if (Number(sub.from) < Number(sentence.from) || Number(sub.to) > Number(sentence.to)) issues.push(sentence.id + ":subtitle-outside-sentence");
    }
  }

  if (!(previousEnd > 0)) issues.push("word-boundary:empty-duration");
  return issues;
}