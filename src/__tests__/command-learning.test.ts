import {
  decideCommandAction,
  isAffirmative,
  isNegative,
  isPendingFresh,
  learningKey,
  parseInterpretResponse,
  type InterpretResult,
} from "@/lib/services/command-learning.service";

const HIGH = 0.8;
const MIN = 0.5;
const cmd = (confidence: number, canonical = "สรุป"): InterpretResult => ({
  type: "command",
  canonical,
  confidence,
});

describe("command-learning decisions", () => {
  it("routes financial entries to the financial parser", () => {
    expect(decideCommandAction({ type: "financial", canonical: "", confidence: 0.9 }, HIGH, MIN)).toEqual({
      action: "financial",
    });
  });

  it("auto-acts on high-confidence commands", () => {
    expect(decideCommandAction(cmd(0.9), HIGH, MIN)).toEqual({ action: "auto", canonical: "สรุป" });
    expect(decideCommandAction(cmd(0.8), HIGH, MIN)).toEqual({ action: "auto", canonical: "สรุป" });
  });

  it("asks to confirm mid-confidence commands", () => {
    expect(decideCommandAction(cmd(0.6), HIGH, MIN)).toEqual({ action: "confirm", canonical: "สรุป" });
    expect(decideCommandAction(cmd(0.5), HIGH, MIN)).toEqual({ action: "confirm", canonical: "สรุป" });
  });

  it("gives up on low-confidence or empty interpretations", () => {
    expect(decideCommandAction(cmd(0.4), HIGH, MIN)).toEqual({ action: "unknown" });
    expect(decideCommandAction(cmd(0.95, ""), HIGH, MIN)).toEqual({ action: "unknown" });
    expect(decideCommandAction({ type: "unknown", canonical: "", confidence: 0 }, HIGH, MIN)).toEqual({
      action: "unknown",
    });
  });
});

describe("affirmative / negative detection", () => {
  it.each(["ใช่", "ใช่ครับ", "โอเค", "ตกลง", "ยืนยัน", "ครับ", "OK", "y", "👍"])(
    "treats %j as affirmative",
    (t) => expect(isAffirmative(t)).toBe(true)
  );
  it.each(["ไม่", "ไม่ใช่", "ผิด", "ยกเลิก", "no", "n", "❌"])("treats %j as negative", (t) =>
    expect(isNegative(t)).toBe(true)
  );
  it("does not treat a real command as yes/no", () => {
    expect(isAffirmative("สรุปหนองปิง")).toBe(false);
    expect(isNegative("รายงานเดือนนี้")).toBe(false);
  });
});

describe("parseInterpretResponse", () => {
  it("parses a plain JSON object", () => {
    const r = parseInterpretResponse('{"type":"command","canonical":"สรุป","confidence":0.9}');
    expect(r).toMatchObject({ type: "command", canonical: "สรุป", confidence: 0.9 });
  });
  it("strips ```json fences", () => {
    const r = parseInterpretResponse('```json\n{"type":"financial","canonical":"","confidence":0.7}\n```');
    expect(r.type).toBe("financial");
  });
  it("clamps confidence and defaults junk to unknown", () => {
    expect(parseInterpretResponse('{"type":"command","canonical":"ช่วย","confidence":5}').confidence).toBe(1);
    expect(parseInterpretResponse("not json").type).toBe("unknown");
    expect(parseInterpretResponse('{"type":"weird","canonical":"x","confidence":0.9}').type).toBe("unknown");
  });
});

describe("learningKey", () => {
  it("trims, collapses whitespace, lowercases", () => {
    expect(learningKey("  Report  ")).toBe("report");
    const k = learningKey("สรุ   ปิง");
    expect(k).toBe(k.trim());
    expect(k).not.toMatch(/\s{2,}/);
  });
});

describe("isPendingFresh", () => {
  const now = Date.now();
  it("is fresh within 10 minutes", () => {
    expect(isPendingFresh(new Date(now - 60 * 1000).toISOString(), now)).toBe(true);
  });
  it("is stale after 10 minutes", () => {
    expect(isPendingFresh(new Date(now - 11 * 60 * 1000).toISOString(), now)).toBe(false);
  });
});
