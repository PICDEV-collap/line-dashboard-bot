import {
  looksLikeShopSummaryFollowUp,
  shopFromSummaryFollowUp,
  naturalizeReply,
} from "@/lib/services/natural-reply.service";

jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({
      generateContent: jest.fn().mockRejectedValue(new Error("offline")),
    }),
  })),
}));

describe("natural-reply.service", () => {
  it("detects shop summary follow-up", () => {
    expect(looksLikeShopSummaryFollowUp("หนองปิงด้วย")).toBe(true);
    expect(looksLikeShopSummaryFollowUp("ญี่ปุ่นด้วยครับ")).toBe(true);
    expect(looksLikeShopSummaryFollowUp("สรุป")).toBe(false);
  });

  it("resolves shop from follow-up text", () => {
    expect(shopFromSummaryFollowUp("หนองปิงด้วย")).toEqual({
      shopId: "shop2",
      shopName: "ก๋วยเตี๋ยวไทยครูตอมสายหนองปิง",
    });
    expect(shopFromSummaryFollowUp("ญี่ปุ่นด้วย")).toEqual({
      shopId: "shop1",
      shopName: "ก๋วยเตี๋ยวไทยครูตอมตลาดญี่ปุ่น",
    });
  });

  it("falls back to template when Gemini fails", async () => {
    const template = "✅ บันทึกแล้ว · วัตถุดิบ ฿1,120";
    const out = await naturalizeReply({
      kind: "record_saved_short",
      userMessage: "วัตถุดิบ 1120",
      template,
    });
    expect(out).toBe(template);
  });
});
