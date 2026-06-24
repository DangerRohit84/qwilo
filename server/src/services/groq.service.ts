import Groq from "groq-sdk";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function resizeUrl(url: string): string {
  return url.replace(
    "/image/upload/",
    "/image/upload/w_1000,q_auto/"
  );
}

export async function ocrHomeworkImage(imageUrl: string): Promise<string> {
  const response = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract all homework text from this notebook page. Return the exact text as written, preserving the original language (Hindi, Telugu, English, etc.). Include all subjects, chapter names, page numbers, and any instructions.",
          },
          { type: "image_url", image_url: { url: resizeUrl(imageUrl) } },
        ],
      },
    ],
    max_tokens: 2000,
  });

  return response.choices[0]?.message?.content || "";
}

export async function parseTasksFromOcr(
  ocrText: string
): Promise<{ type: string; subject: string; description: string }[]> {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          'You are a homework parser. Given OCR text from a student\'s homework notebook, extract each task as a JSON object with fields: type (READING | WRITING | MATH | OTHER), subject (auto-detect from content, e.g. Science, English, Math, Hindi, Telugu), description (brief task description in the same language as the input text). Return a JSON object with a "tasks" key containing the array of tasks, e.g. {"tasks": [{"type": "MATH", "subject": "Math", "description": "..."}]}.',
      },
      { role: "user", content: ocrText },
    ],
    response_format: { type: "json_object" },
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content || "{}";
  console.log(`[parseTasksFromOcr] Raw response: ${content.slice(0, 500)}`);
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.tasks)) return parsed.tasks;
    if (Array.isArray(parsed)) return parsed;
    console.warn(`[parseTasksFromOcr] Unexpected shape: ${JSON.stringify(parsed).slice(0, 200)}`);
    return [];
  } catch (e) {
    console.error(`[parseTasksFromOcr] JSON parse failed: ${content.slice(0, 300)}`);
    return [];
  }
}

export async function analyzeSubmittedWork(
  imageUrls: string[],
  taskType: string,
  taskDescription: string
): Promise<string> {
  const contentParts: any[] = [
    {
      type: "text",
      text: `This is a student's ${taskType} submission for: "${taskDescription}". Analyze the work. Is it complete? What topics are covered? Provide a brief educational analysis (2-3 sentences). Write the analysis in the SAME LANGUAGE as the task description.`,
    },
    ...imageUrls.map((url) => ({
      type: "image_url" as const,
      image_url: { url: resizeUrl(url) },
    })),
  ];

  const response = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    messages: [{ role: "user", content: contentParts }],
    max_tokens: 1000,
  });

  return response.choices[0]?.message?.content || "Analysis complete.";
}

export async function generateQuestions(
  taskType: string,
  taskDescription: string,
  subject: string,
  analysis: string
): Promise<
  { type: string; questionText: string; options?: string[]; correctAnswer: string }[]
> {
  const seed = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are an educational AI that creates assessment questions based on a student's actual homework.

Your job: Identify the MOST IMPORTANT concepts from the homework and generate questions using the BEST question type for each concept. Generate 3 to 8 questions — the count depends on the homework's complexity and amount of content. Simple homework gets 3-4 questions, detailed homework gets 6-8.

Available question types — use ONLY the ones that fit the content:

1. MCQ — Multiple choice with 4 options, one correct. Use for: concept recall, factual questions, definitions.
2. TRUE_FALSE — True or False. Use for: quick fact checks, yes/no concepts, simple statements.
3. FILL_BLANK — Fill in the missing word/phrase. The "questionText" must contain "___" where the blank is, and "correctAnswer" is the missing word. Use for: key terms, formulas, vocabulary, dates.
4. ONE_WORD — Student types a single word or number as answer. Use for: names, dates, numerical answers, short factual answers.
5. SHORT_ANSWER — Student types a written response (2-4 sentences). Use for: explanations, descriptions, short essays.
6. VOICE — Student speaks the answer. Use for: detailed explanations, open-ended analysis, storytelling.

Rules:
- Analyze the homework and pick the MOST APPROPRIATE type for each concept
- Don't force a type if it doesn't suit the content — skip it
- **CRITICAL — Script-based type restriction**:
  - If the homework is in a NON-LATIN script language (Hindi, Telugu, Tamil, Kannada, Malayalam, Bengali, Gujarati, Marathi, Odia, Punjabi, Assamese, Sanskrit, Urdu, etc.), you MUST ONLY use: MCQ, TRUE_FALSE, and VOICE. Do NOT use FILL_BLANK, ONE_WORD, or SHORT_ANSWER because students cannot easily type these scripts on a phone keyboard.
  - If the homework is in English or other Latin-script languages (French, Spanish, German, etc.), you may use ALL 6 types freely.
- Math homework → more FILL_BLANK (formulas), ONE_WORD (numbers), TRUE_FALSE
- Science → more MCQ (concepts), TRUE_FALSE (facts), FILL_BLANK (terms)
- Language/History → more VOICE (explanations), SHORT_ANSWER (descriptions), MCQ (comprehension)
- Match the SAME LANGUAGE as the homework
- Each question must be UNIQUE and SPECIFIC to the student's actual work
- For MCQ: exactly 4 options, only one correct
- For FILL_BLANK: put "___" in questionText where the blank is
- For VOICE: provide expected key points in correctAnswer
- For SHORT_ANSWER: provide key points to check in correctAnswer

Return ONLY valid JSON: { "questions": [{ type: "MCQ"|"TRUE_FALSE"|"FILL_BLANK"|"ONE_WORD"|"SHORT_ANSWER"|"VOICE", questionText: string, options?: string[], correctAnswer: string }] }
No markdown, no explanation.`,
      },
      {
        role: "user",
        content: `Task type: ${taskType}
Subject: ${subject}
Description: ${taskDescription}
Analysis of student work: ${analysis}
Unique seed: ${seed}

Identify the important concepts from this homework. Generate 3 to 8 questions depending on the amount and complexity of the content — more concepts = more questions, simple homework = fewer questions. For EACH key concept, choose the BEST question type that tests understanding of it. Don't force types that don't fit. Write everything in the SAME LANGUAGE as the task description.`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 3000,
  });

  const content = response.choices[0]?.message?.content || "[]";
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed.questions) ? parsed.questions : Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function transcribeAudio(audioPath: string): Promise<string> {
  const file = fs.createReadStream(audioPath);

  const response = await groq.audio.transcriptions.create({
    file,
    model: "whisper-large-v3",
    response_format: "text",
  });

  return typeof response === "string" ? response : (response as any)?.text || "";
}

export async function evaluateVoiceAnswer(
  questionText: string,
  correctAnswer: string,
  studentResponse: string
): Promise<{ isCorrect: boolean; score: number; feedback: string }> {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "You evaluate student answers. Given the question, correct answer, and student's spoken response, determine if the answer is essentially correct (semantically, not verbatim). Return JSON: { isCorrect: boolean, score: number (0-100), feedback: string }. Be generous with partial correctness. Write feedback in the SAME LANGUAGE as the question and student's response.",
      },
      {
        role: "user",
        content: `Question: "${questionText}"\nCorrect answer: "${correctAnswer}"\nStudent said: "${studentResponse}"`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content || "{}";
  try {
    return JSON.parse(content);
  } catch {
    return { isCorrect: false, score: 0, feedback: "Could not evaluate." };
  }
}

export async function evaluateShortAnswer(
  questionText: string,
  correctAnswer: string,
  studentResponse: string
): Promise<{ isCorrect: boolean; score: number; feedback: string }> {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "You evaluate student typed answers. Given the question, expected key points, and student's typed response, determine if the answer covers the key points semantically (not verbatim). Return JSON: { isCorrect: boolean, score: number (0-100), feedback: string }. Be generous with partial correctness — if the student covers some key points, give partial credit. Write feedback in the SAME LANGUAGE as the question.",
      },
      {
        role: "user",
        content: `Question: "${questionText}"\nExpected key points: "${correctAnswer}"\nStudent typed: "${studentResponse}"`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content || "{}";
  try {
    return JSON.parse(content);
  } catch {
    return { isCorrect: false, score: 0, feedback: "Could not evaluate." };
  }
}

export async function explainCorrectAnswer(
  questionText: string,
  correctAnswer: string,
  studentAnswer: string
): Promise<{ explanation: string }> {
  const isCorrect = studentAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: "You are a helpful tutor. Explain answers clearly and concisely in 2-3 sentences. Be encouraging and educational. Write the explanation in the SAME LANGUAGE as the question.",
      },
      {
        role: "user",
        content: isCorrect
          ? `Question: "${questionText}"\nThe student correctly answered: "${correctAnswer}". Briefly explain why this answer is correct.`
          : `Question: "${questionText}"\nCorrect answer: "${correctAnswer}"\nStudent answered: "${studentAnswer}"\nExplain why the student's answer is wrong and why "${correctAnswer}" is correct.`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 300,
  });

  const content = response.choices[0]?.message?.content || "{}";
  try {
    return JSON.parse(content);
  } catch {
    return { explanation: `The correct answer is: ${correctAnswer}` };
  }
}
