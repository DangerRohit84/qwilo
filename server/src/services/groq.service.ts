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
            text: "Extract all homework text from this notebook page. Return the exact text as written. Include all subjects, chapter names, page numbers, and any instructions.",
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
          "You are a homework parser. Given OCR text from a student's homework notebook, extract each task as a JSON object with fields: type (READING | WRITING | MATH | OTHER), subject (auto-detect from content, e.g. Science, English, Math), description (brief task description). Return ONLY a valid JSON array, no markdown, no explanation.",
      },
      { role: "user", content: ocrText },
    ],
    response_format: { type: "json_object" },
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content || "[]";
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed.tasks) ? parsed.tasks : Array.isArray(parsed) ? parsed : [];
  } catch {
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
      text: `This is a student's ${taskType} submission for: "${taskDescription}". Analyze the work. Is it complete? What topics are covered? Provide a brief educational analysis (2-3 sentences).`,
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
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are an educational AI that creates assessment questions based on a student's actual homework. 

Requirements:
- Generate exactly 5 questions STRICTLY based on the provided content
- 3 MCQ (multiple choice with exactly 4 options each, only one correct)
- 2 VOICE (open-ended questions for spoken response)
- Questions must test understanding of the SPECIFIC topics, concepts, and material from the student's work
- Correct answers must be accurate and directly from the content
- For VOICE questions, provide the expected key points the student should mention

Return ONLY a valid JSON object with a "questions" array. Each item: { type: "MCQ"|"VOICE", questionText: string, options?: string[], correctAnswer: string }
No markdown, no explanation.`,
      },
      {
        role: "user",
        content: `Task type: ${taskType}
Subject: ${subject}
Description: ${taskDescription}
Analysis of student work: ${analysis}

IMPORTANT: Generate 5 questions (3 MCQ + 2 VOICE) that are DIRECTLY based on the content described above. Each question should test understanding of the specific topics covered. For MCQ questions, provide 4 plausible options. For VOICE questions, specify the expected correct answer content.`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 2000,
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
    language: "en",
    response_format: "text",
  });

  return (response as unknown as string) || "";
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
          "You evaluate student answers. Given the question, correct answer, and student's spoken response, determine if the answer is essentially correct (semantically, not verbatim). Return JSON: { isCorrect: boolean, score: number (0-100), feedback: string }. Be generous with partial correctness.",
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

export async function explainCorrectAnswer(
  questionText: string,
  correctAnswer: string,
  studentAnswer: string
): Promise<{ explanation: string }> {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: "You explain correct answers to students. Given the question, correct answer, and the student's wrong answer, provide a brief explanation (2-3 sentences) of why the correct answer is right. Be encouraging and educational.",
      },
      {
        role: "user",
        content: `Question: "${questionText}"\nCorrect answer: "${correctAnswer}"\nStudent answered: "${studentAnswer}"\n\nExplain why the correct answer is right.`,
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
