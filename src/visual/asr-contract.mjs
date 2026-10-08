export function normalizeText(text = "") {
  return String(text).normalize("NFKC").toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

export function lintAsrSecondPass(script, timeline, asr) {
  const issues = [];
  if (!asr || !Array.isArray(asr.segments)) return ["asr:missing-segments"];
  const expected = (script?.segments || []).map((segment, i) => ({
    id: timeline?.sentences?.[i]?.id || "S" + String(i + 1).padStart(2, "0"),
    text: segment.text,
  }));
  if (asr.segments.length !== expected.length) issues.push("asr:segment-count-mismatch");

  for (let i = 0; i < expected.length; i++) {
    const got = asr.segments[i];
    if (!got) {
      issues.push(expected[i].id + ":missing-asr-segment");
      continue;
    }
    if (got.id && got.id !== expected[i].id) issues.push(expected[i].id + ":asr-id-mismatch");

    const expectedText = normalizeText(expected[i].text);
    const actualText = normalizeText(got.text);
    if (!expectedText || !actualText) {
      issues.push(expected[i].id + ":empty-asr-text");
    } else {
      const similarity = actualText === expectedText ? 1 : (() => {
        const common = [...new Set([...expectedText])].filter((ch) => actualText.includes(ch)).length;
        return common / Math.max(1, new Set([...expectedText]).size);
      })();
      if (similarity < Number(asr.thresholds?.text_similarity ?? 0.92)) {
        issues.push(expected[i].id + ":asr-text-mismatch");
      }
    }

    const start = Number(got.start);
    const end = Number(got.end);
    if (!(Number.isFinite(start) && Number.isFinite(end) && end > start)) {
      issues.push(expected[i].id + ":invalid-asr-timing");
    }
  }

  const mode = asr.alignment_mode || (asr.required_real_asr ? "external-asr" : "tts-word-boundary");
  if (asr.required_real_asr && (mode !== "external-asr" || asr.source !== "external-asr-provider")) {
    issues.push("asr:real-provider-required");
  }
  if (!asr.required_real_asr && mode !== "tts-word-boundary") {
    issues.push("asr:candidate-mode-must-use-tts-word-boundary");
  }
  return issues;
}
