import {
  normalizeNaturalCommandLine,
  buildCorrectionSummary,
  hasPorkPriceOnlyUpdate,
  buildPorkPriceSavedHint,
} from "@/lib/services/smart-command.service";
import { parseCorrectionMessage } from "@/lib/services/financial-correction.service";

describe("normalizeNaturalCommandLine", () => {
  it("inserts spaces in glued Thai shop shorthand", () => {
    expect(normalizeNaturalCommandLine("ปรับหมูสับราคา 120")).toBe("ปรับ หมูสับ ราคา 120");
    expect(normalizeNaturalCommandLine("ปรับหมูแดง ราคา 130")).toBe("ปรับ หมูแดง ราคา 130");
    expect(normalizeNaturalCommandLine("ปรับมันหมูราคา 65")).toBe("ปรับ มันหมู ราคา 65");
  });
});

describe("screenshot pork price correction", () => {
  const text = [
    "ญี่ปุ่น",
    "ปรับหมูสับราคา 120",
    "ปรับหมูแดง ราคา 130",
    "ปรับมันหมูราคา 65",
  ].join("\n");

  it("parses all three pork prices", () => {
    const actions = parseCorrectionMessage(text);
    expect(actions).toHaveLength(3);
    expect(actions).toEqual(
      expect.arrayContaining([
        { op: "set", field: "porkPrice", pork: "minced", value: 120 },
        { op: "set", field: "porkPrice", pork: "red", value: 130 },
        { op: "set", field: "porkPrice", pork: "fat", value: 65 },
      ])
    );
  });

  it("builds human-readable summary", () => {
    const actions = parseCorrectionMessage(text);
    const summary = buildCorrectionSummary(actions);
    expect(summary).toContain("หมูสับ ฿120/กก.");
    expect(summary).toContain("หมูแดง ฿130/กก.");
    expect(summary).toContain("มันหมู ฿65/กก.");
    expect(hasPorkPriceOnlyUpdate(actions)).toBe(true);
    expect(buildPorkPriceSavedHint()).toMatch(/แดง4/);
  });
});
