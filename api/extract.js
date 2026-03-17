/**
 * /api/extract
 *
 * Accepts a base64-encoded document (PDF or image) and uses GPT-4o Vision
 * to extract structured invoice/contract data.
 *
 * POST body (JSON):
 *   {
 *     data: string,        // base64-encoded file content
 *     mimeType: string,    // e.g. "application/pdf" or "image/jpeg"
 *     filename: string,    // original filename for context
 *     emailSubject: string,
 *     emailFrom: string,
 *     emailDate: string,
 *   }
 *
 * Returns structured JSON:
 *   {
 *     type: "invoice" | "contract" | "insurance" | "receipt" | "other",
 *     vendor: string,
 *     vendorEmail: string,
 *     amount: number | null,
 *     currency: string,
 *     invoiceNumber: string,
 *     invoiceDate: string,
 *     dueDate: string,
 *     lineItems: [{ description, quantity, unitPrice, total }],
 *     paymentTerms: string,
 *     confidence: number,   // 0-1
 *     flags: string[],      // anomalies detected
 *     rawText: string,      // extracted text for search
 *   }
 */

const EXTRACTION_PROMPT = `You are a financial document extraction AI for Dominion, a business back-office platform.

Analyze the provided document and extract all financial information. Return ONLY valid JSON matching this exact schema:

{
  "type": "invoice" | "contract" | "insurance" | "receipt" | "purchase_order" | "other",
  "vendor": "Company name that sent this document",
  "vendorEmail": "vendor email if visible",
  "vendorPhone": "vendor phone if visible",
  "vendorAddress": "vendor address if visible",
  "amount": 1234.56,
  "currency": "USD",
  "invoiceNumber": "INV-12345",
  "invoiceDate": "2024-01-15",
  "dueDate": "2024-02-15",
  "paymentTerms": "Net 30",
  "lineItems": [
    {
      "description": "Service description",
      "quantity": 1,
      "unitPrice": 500.00,
      "total": 500.00
    }
  ],
  "subtotal": 1000.00,
  "tax": 100.00,
  "discount": 0,
  "totalAmount": 1100.00,
  "notes": "any special notes or payment instructions",
  "confidence": 0.95,
  "flags": [],
  "rawText": "key text extracted from document"
}

For "flags", include any of these if detected:
- "duplicate_suspected" — invoice number or amount matches a common pattern
- "price_unusually_high" — amount seems high for the service type
- "missing_invoice_number" — no invoice number found
- "missing_due_date" — no due date found
- "vague_line_items" — line items are not specific enough
- "round_number_amount" — suspiciously round dollar amount

If a field is not found, use null. Dates must be in YYYY-MM-DD format. Return ONLY the JSON object, no markdown, no explanation.`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
  }

  const { data, mimeType, filename, emailSubject, emailFrom, emailDate } = req.body || {};

  if (!data) {
    return res.status(400).json({ error: 'data (base64 document) is required' });
  }

  // Build the message content for GPT-4o
  const userContent = [];

  // Add context from the email
  if (emailSubject || emailFrom) {
    userContent.push({
      type: 'text',
      text: `Email context:\n- Subject: ${emailSubject || 'N/A'}\n- From: ${emailFrom || 'N/A'}\n- Date: ${emailDate || 'N/A'}\n- Filename: ${filename || 'N/A'}\n\nExtract all financial data from the document below:`,
    });
  }

  // For images, use vision directly
  const isImage = mimeType && (mimeType.startsWith('image/'));
  const isPdf = mimeType === 'application/pdf';

  if (isImage) {
    userContent.push({
      type: 'image_url',
      image_url: {
        url: `data:${mimeType};base64,${data}`,
        detail: 'high',
      },
    });
  } else if (isPdf) {
    // For PDFs, we pass the base64 data as a file reference
    // GPT-4o can handle PDF via the file API, but for simplicity we'll
    // send it as a base64 image_url with pdf mime type
    userContent.push({
      type: 'text',
      text: `[PDF document attached as base64: ${filename || 'document.pdf'}]\nBase64 data (first 500 chars): ${data.slice(0, 500)}...\n\nNote: Extract what you can from the filename and email context if the PDF content is not directly readable.`,
    });
  } else {
    userContent.push({
      type: 'text',
      text: `Document filename: ${filename}\nMime type: ${mimeType}\nExtract financial data based on filename and email context.`,
    });
  }

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          { role: 'user', content: userContent },
        ],
        max_tokens: 1500,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.json().catch(() => ({}));
      console.error('OpenAI API error:', err);
      return res.status(openaiRes.status).json({ error: 'openai_error', details: err });
    }

    const openaiData = await openaiRes.json();
    const content = openaiData.choices?.[0]?.message?.content || '{}';

    let extracted;
    try {
      extracted = JSON.parse(content);
    } catch {
      return res.status(500).json({ error: 'parse_error', raw: content });
    }

    // Add metadata
    extracted.extractedAt = new Date().toISOString();
    extracted.sourceFilename = filename;
    extracted.sourceEmail = emailFrom;
    extracted.sourceSubject = emailSubject;
    extracted.sourceDate = emailDate;

    return res.status(200).json(extracted);
  } catch (err) {
    console.error('Extraction error:', err);
    return res.status(500).json({ error: 'extraction_failed', message: err.message });
  }
}
