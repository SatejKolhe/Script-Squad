const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { protect } = require('../middleware/auth');

const router = express.Router();

/**
 * Gets the best available working model from Gemini API.
 * Uses gemini-flash-latest as primary, with robust fallbacks.
 */
function getGenerativeModel(genAI) {
  const models = ['gemini-flash-latest', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];
  for (const m of models) {
    try {
      return genAI.getGenerativeModel({ model: m });
    } catch (e) {
      // try next fallback model
    }
  }
  return genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
}

// @route   POST /api/ai/suggest-tasks
// @desc    Use Gemini to generate task suggestions for a project
// @access  Private
router.post('/suggest-tasks', protect, async (req, res) => {
  const { title, description } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Project title is required for suggestions' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ success: false, message: 'AI service not configured. Add GEMINI_API_KEY to .env' });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = getGenerativeModel(genAI);

    const prompt = `You are a professional project manager. A user just created a project with the following details:

Project Title: "${title.trim()}"
${description?.trim() ? `Project Description: "${description.trim()}"` : ''}

Generate a practical task breakdown for this project. Return ONLY a valid JSON array (no markdown, no explanation) with 6 to 8 tasks. Each task must follow this exact schema:

[
  {
    "title": "Short, actionable task title (max 60 chars)",
    "description": "One-sentence description of what to do (max 120 chars)",
    "priority": "high" | "medium" | "low"
  }
]

Rules:
- Tasks should be concrete and immediately actionable
- Order tasks logically (setup/planning first, delivery last)
- Assign priority based on criticality: high = blocking/critical, medium = important, low = nice-to-have
- Do NOT wrap the JSON in markdown code fences
- Return ONLY the raw JSON array`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text().trim();

    // Robustly parse — strip any accidental markdown fences
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    let suggestions;

    try {
      suggestions = JSON.parse(cleaned);
    } catch {
      console.error('Gemini returned non-JSON:', rawText);
      return res.status(500).json({ success: false, message: 'AI returned an unexpected response. Please try again.' });
    }

    if (!Array.isArray(suggestions)) {
      return res.status(500).json({ success: false, message: 'AI returned an unexpected format. Please try again.' });
    }

    const validPriorities = ['high', 'medium', 'low'];
    const sanitized = suggestions
      .filter((s) => s && typeof s.title === 'string' && s.title.trim())
      .slice(0, 10)
      .map((s, i) => ({
        id: i,
        title: s.title.trim().substring(0, 200),
        description: typeof s.description === 'string' ? s.description.trim().substring(0, 300) : '',
        priority: validPriorities.includes(s.priority) ? s.priority : 'medium',
      }));

    if (sanitized.length === 0) {
      return res.status(500).json({ success: false, message: 'AI could not generate suggestions. Please try again.' });
    }

    console.log(`🤖 AI generated ${sanitized.length} task suggestions for project: "${title}"`);
    res.json({ success: true, data: sanitized });
  } catch (err) {
    console.error('Gemini API error:', err.message);
    const msg = err.message?.includes('API_KEY') || err.message?.includes('403')
      ? 'Invalid or missing Gemini API key. Check your .env file.'
      : err.message?.includes('quota') || err.message?.includes('429')
      ? 'AI quota exceeded. Please try again in a moment.'
      : 'AI service error. Please try again.';
    res.status(500).json({ success: false, message: msg });
  }
});

// @route   POST /api/ai/extract-task
// @route   POST /api/ai/extract-task
// @desc    Use Gemini to extract/parse task title, description, priority, date, and subtask suggestions from text OR an uploaded file (base64)
// @access  Private
router.post('/extract-task', protect, async (req, res) => {
  const { fileData, mimeType, text } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ success: false, message: 'AI service not configured. Add GEMINI_API_KEY to .env' });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = getGenerativeModel(genAI);
    const currentDate = new Date().toISOString().split('T')[0];

    let result;

    if (fileData && mimeType) {
      // ── File Analysis Mode ──
      const base64Data = fileData.replace(/^data:.*?;base64,/, '');

      // Check if it's a plain text/code file
      if (mimeType.startsWith('text/')) {
        const textContent = Buffer.from(base64Data, 'base64').toString('utf-8');
        const prompt = `Analyze the following file content and extract key actionable tasks and suggestions.
Current Date: "${currentDate}"
File Content:
"""
${textContent.substring(0, 8000)}
"""

Return ONLY a valid raw JSON object (no markdown code blocks, no extra text):
{
  "title": "Short, clear task title (max 60 chars)",
  "description": "Summary description of what needs to be done (max 150 chars)",
  "priority": "high" | "medium" | "low",
  "dueDate": "YYYY-MM-DD", // Plausible date if found, else empty string ""
  "suggestions": [
    "Subtask 1 or action item",
    "Subtask 2 or action item",
    "Subtask 3 or action item"
  ]
}`;
        result = await model.generateContent(prompt);
      } else {
        // Image or PDF file
        const prompt = `Analyze this file. Extract the main task details and 3 to 5 actionable step suggestions.
Current Date: "${currentDate}"

Return ONLY a valid raw JSON object (no markdown code blocks, no extra text):
{
  "title": "Short, clear task title (max 60 chars)",
  "description": "Summary description of the file/action item (max 150 chars)",
  "priority": "high" | "medium" | "low",
  "dueDate": "YYYY-MM-DD", // Plausible date if found or calculated, else empty string ""
  "suggestions": [
    "Subtask 1 or action item",
    "Subtask 2 or action item",
    "Subtask 3 or action item"
  ]
}`;

        result = await model.generateContent([
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          prompt,
        ]);
      }
    } else if (text && text.trim()) {
      // ── Natural Language Text Smart Parsing Mode ──
      const prompt = `You are an AI task assistant. Analyze this natural language task input and smart-parse it into task fields and suggestions.
User Input: "${text.trim()}"
Current Date: "${currentDate}"

Return ONLY a valid raw JSON object (no markdown code blocks, no extra text):
{
  "title": "Cleaned, actionable task title (max 60 chars)",
  "description": "Any additional context or brief description",
  "priority": "high" | "medium" | "low",
  "dueDate": "YYYY-MM-DD", // Calculated date if mentioned like 'tomorrow', 'next Monday', 'by Friday', else empty string ""
  "suggestions": [
    "Step 1 or subtask suggestion",
    "Step 2 or subtask suggestion",
    "Step 3 or subtask suggestion"
  ]
}`;

      result = await model.generateContent(prompt);
    } else {
      // ── Smart Generation Fallback Mode ──
      const prompt = `Generate a useful developer/student productivity task recommendation with subtask suggestions.
Current Date: "${currentDate}"

Return ONLY a valid raw JSON object (no markdown code blocks, no extra text):
{
  "title": "Actionable task title (max 60 chars)",
  "description": "One sentence summary of the task",
  "priority": "medium",
  "dueDate": "YYYY-MM-DD",
  "suggestions": [
    "Step 1: Set up initial structure",
    "Step 2: Implement core functionality",
    "Step 3: Review and verify results"
  ]
}`;

      result = await model.generateContent(prompt);
    }

    const rawText = result.response.text().trim();
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    let extracted;
    try {
      extracted = JSON.parse(cleaned);
    } catch (e) {
      console.error('Gemini returned non-JSON:', rawText);
      return res.status(500).json({ success: false, message: 'Failed to parse AI response.' });
    }

    // Sanitize output
    const validPriorities = ['high', 'medium', 'low'];
    const sanitizedData = {
      title: typeof extracted.title === 'string' ? extracted.title.trim() : 'New Task',
      description: typeof extracted.description === 'string' ? extracted.description.trim() : '',
      priority: validPriorities.includes(extracted.priority) ? extracted.priority : 'medium',
      dueDate: typeof extracted.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(extracted.dueDate) ? extracted.dueDate : '',
      suggestions: Array.isArray(extracted.suggestions)
        ? extracted.suggestions.filter((s) => typeof s === 'string' && s.trim()).slice(0, 5)
        : [],
    };

    console.log(`✨ AI task extracted successfully: "${sanitizedData.title}" (${sanitizedData.suggestions.length} suggestions)`);
    res.json({ success: true, data: sanitizedData });
  } catch (err) {
    console.error('Gemini extraction error:', err.message);
    const msg = err.message?.includes('API_KEY') || err.message?.includes('403')
      ? 'Invalid API key.'
      : err.message?.includes('quota') || err.message?.includes('429')
      ? 'AI quota exceeded. Please try again in a moment.'
      : 'AI service error.';
    res.status(500).json({ success: false, message: msg });
  }
});

module.exports = router;
