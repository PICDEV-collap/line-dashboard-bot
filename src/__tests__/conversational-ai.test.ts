import { generateConversationalAiReply } from "@/lib/services/natural-reply.service";

describe("Conversational AI Assistant", () => {
  it("returns fallback greeting when empty input is passed", async () => {
    const res = await generateConversationalAiReply("");
    expect(res).toContain("ครูตอม");
    expect(res).toContain("สรุป");
  });

  it("returns warm fallback response when Groq API is unavailable", async () => {
    const res = await generateConversationalAiReply("สวัสดีครับ บอททำอะไรได้บ้าง");
    expect(res).toBeDefined();
    expect(res.length).toBeGreaterThan(10);
    expect(res).toContain("ครูตอม");
  });
});
