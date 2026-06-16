import Groq from "groq-sdk";
import { ENV, SUPPORTED_OCR_TYPES } from "@/config/constants";
import { withRetry } from "@/lib/utils/retry";
import { ExternalServiceError, ValidationError } from "@/lib/utils/error-handler";
import { createLogger } from "@/lib/middleware/logger";
import { safeJsonParse } from "@/lib/utils/helpers";

const logger = createLogger("AIService");

function getClient(): Groq {
  return new Groq({ apiKey: ENV.GROQ_API_KEY() });
}

export interface OcrExtraction {
  rawText: string;
  structuredData: Record<string, unknown>;
  confidence: number;
  language?: string;
  documentType?: string;
}

const OCR_PROMPT = `Analyze this image carefully and perform the following tasks:

1. Extract ALL text visible in the image (OCR). Preserve the original layout/structure as much as possible.
2. Identify the document type (e.g., receipt, invoice, ID card, form, contract, screenshot, etc.)
3. Structure the extracted data into a logical JSON format based on the document type.
4. Estimate your confidence in the extraction (0.0 to 1.0).
5. Detect the primary language(s) of the text.

Respond ONLY with valid JSON in this exact structure:
{
  "rawText": "all extracted text here, preserving newlines with \\n",
  "documentType": "detected document type",
  "language": "detected language code (e.g. th, en, zh)",
  "confidence": 0.95,
  "structuredData": {
    // structured fields based on document type
    // For receipt: { vendor, date, items: [...], total, tax }
    // For invoice: { invoiceNumber, date, vendor, customer, items: [...], subtotal, tax, total }
    // For ID card: { name, idNumber, dateOfBirth, address, expiryDate }
    // For form: { fields: [{ label, value }] }
    // For other: { extractedFields: {} }
  }
}`;

export async function extractTextFromImage(
  imageBuffer: Buffer,
  mimeType: string = "image/jpeg"
): Promise<OcrExtraction> {
  if (!SUPPORTED_OCR_TYPES.includes(mimeType as typeof SUPPORTED_OCR_TYPES[number])) {
    throw new ValidationError(`Unsupported image type for OCR: ${mimeType}`);
  }

  logger.info("Starting OCR extraction", { mimeType, size: imageBuffer.length });

  return withRetry(async () => {
    const client = getClient();
    const base64 = imageBuffer.toString("base64");

    const result = await client.chat.completions.create({
      model: ENV.GROQ_VISION_MODEL(),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: OCR_PROMPT },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    });

    const text = result.choices?.[0]?.message?.content ?? "";

    if (!text) {
      throw new ExternalServiceError("Groq", "Empty response from OCR");
    }

    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = safeJsonParse<{
      rawText: string;
      structuredData: Record<string, unknown>;
      confidence: number;
      language?: string;
      documentType?: string;
    }>(cleaned);

    if (!parsed || typeof parsed.rawText !== "string") {
      logger.warn("OCR response not valid JSON, using raw text", { cleaned: cleaned.slice(0, 200) });
      return {
        rawText: text,
        structuredData: { rawResponse: text },
        confidence: 0.5,
      };
    }

    logger.info("OCR extraction complete", {
      documentType: parsed.documentType,
      confidence: parsed.confidence,
      textLength: parsed.rawText.length,
    });

    return {
      rawText: parsed.rawText,
      structuredData: parsed.structuredData ?? {},
      confidence: parsed.confidence ?? 0.8,
      language: parsed.language,
      documentType: parsed.documentType,
    };
  });
}

export async function describeImage(imageBuffer: Buffer, mimeType = "image/jpeg"): Promise<string> {
  const client = getClient();
  const base64 = imageBuffer.toString("base64");

  const result = await client.chat.completions.create({
    model: ENV.GROQ_VISION_MODEL(),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Describe this image briefly in Thai. What do you see?" },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
        ],
      },
    ],
    temperature: 0.3,
    max_tokens: 1024,
  });

  return result.choices?.[0]?.message?.content ?? "";
}
