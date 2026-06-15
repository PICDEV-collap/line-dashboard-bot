import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { ENV, SUPPORTED_OCR_TYPES } from "@/config/constants";
import { withRetry } from "@/lib/utils/retry";
import { ExternalServiceError, ValidationError } from "@/lib/utils/error-handler";
import { createLogger } from "@/lib/middleware/logger";
import { safeJsonParse } from "@/lib/utils/helpers";

const logger = createLogger("GeminiService");

function getClient(): GoogleGenerativeAI {
  return new GoogleGenerativeAI(ENV.GEMINI_API_KEY());
}

export interface OcrExtraction {
  rawText: string;
  structuredData: Record<string, unknown>;
  confidence: number;
  language?: string;
  documentType?: string;
}

// Safety settings — permissive for document OCR
const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

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
    const model = client.getGenerativeModel({
      model: ENV.GEMINI_MODEL(),
      safetySettings: SAFETY_SETTINGS,
    });

    const result = await model.generateContent([
      OCR_PROMPT,
      {
        inlineData: {
          mimeType,
          data: imageBuffer.toString("base64"),
        },
      },
    ]);

    const response = result.response;
    const text = response.text();

    if (!text) {
      throw new ExternalServiceError("Gemini", "Empty response from OCR");
    }

    // Strip potential markdown code fences
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
  const model = client.getGenerativeModel({ model: ENV.GEMINI_MODEL() });

  const result = await model.generateContent([
    "Describe this image briefly in Thai. What do you see?",
    { inlineData: { mimeType, data: imageBuffer.toString("base64") } },
  ]);

  return result.response.text();
}
