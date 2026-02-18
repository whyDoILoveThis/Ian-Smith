import { NextResponse } from "next/server";
import type { QuizConfig, Quiz, QuizQuestion, UserAnswer, QuizResult, QuestionFeedback } from "@/types/Quiz.type";

const GENERATE_QUIZ_PROMPT = (config: QuizConfig) => {
  const { topic, questionCount, questionTypes } = config;
  
  // Calculate how many of each type
  const trueFalseCount = Math.round((questionTypes.trueFalse / 100) * questionCount);
  const multipleChoiceCount = Math.round((questionTypes.multipleChoice / 100) * questionCount);
  const typedCount = questionCount - trueFalseCount - multipleChoiceCount;

  return {
    role: "system",
    content: `You are a quiz generator. Generate a quiz about "${topic}" with exactly ${questionCount} questions.

Question distribution:
- True/False questions: ${trueFalseCount}
- Multiple Choice questions (4 options each): ${multipleChoiceCount}
- Typed answer questions (short answer): ${typedCount}

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanation. The response must be parseable JSON.

Return this exact JSON structure:
{
  "questions": [
    {
      "id": 1,
      "type": "true-false",
      "question": "The question text here?",
      "options": ["True", "False"],
      "correctAnswer": "True"
    },
    {
      "id": 2,
      "type": "multiple-choice",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A"
    },
    {
      "id": 3,
      "type": "typed",
      "question": "Question requiring a typed answer?",
      "correctAnswer": "expected answer"
    }
  ]
}

Rules:
- Each question must have a unique sequential id starting from 1
- Multiple choice must have exactly 4 options
- True/False must have options ["True", "False"]
- Typed questions should have short, clear expected answers (1-3 words ideally)
- correctAnswer must exactly match one of the options (for true-false and multiple-choice)
- Questions should be educational and appropriate for general audiences
- Vary difficulty from easy to medium
- Return ONLY the JSON object, nothing else`
  };
};

const GRADE_QUIZ_PROMPT = (questions: QuizQuestion[], answers: UserAnswer[]) => {
  const questionsWithAnswers = questions.map(q => {
    const userAnswer = answers.find(a => a.questionId === q.id);
    return {
      id: q.id,
      type: q.type,
      question: q.question,
      correctAnswer: q.correctAnswer,
      userAnswer: userAnswer?.answer || "No answer provided"
    };
  });

  return {
    role: "system",
    content: `You are a quiz grader. Grade the following quiz answers and provide brief, helpful feedback for each question.

Quiz Questions and Answers:
${JSON.stringify(questionsWithAnswers, null, 2)}

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanation. The response must be parseable JSON.

For TYPED answers, be lenient - accept answers that are semantically correct even if not word-for-word matches.
Consider spelling variations, abbreviations, and equivalent phrasings as correct.

Return this exact JSON structure:
{
  "feedback": [
    {
      "questionId": 1,
      "isCorrect": true,
      "feedback": "One to two sentence feedback about this answer, explaining why it's correct or what the right answer should be."
    }
  ]
}

Rules:
- Provide feedback for every question
- Be encouraging but accurate
- For incorrect answers, briefly explain the correct answer
- For correct answers, provide a reinforcing fact or context
- Keep each feedback to 1-2 sentences maximum
- Return ONLY the JSON object, nothing else`
  };
};

async function callGroqAPI(systemPrompt: { role: string; content: string }, userMessage?: string) {
  const messages = userMessage 
    ? [systemPrompt, { role: "user", content: userMessage }]
    : [systemPrompt, { role: "user", content: "Generate the quiz now." }];

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Groq API error:", response.status, errorText);
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error("No content in API response");
  }

  // Clean the response - remove markdown code blocks if present
  let cleanedContent = content.trim();
  if (cleanedContent.startsWith("```json")) {
    cleanedContent = cleanedContent.slice(7);
  } else if (cleanedContent.startsWith("```")) {
    cleanedContent = cleanedContent.slice(3);
  }
  if (cleanedContent.endsWith("```")) {
    cleanedContent = cleanedContent.slice(0, -3);
  }
  cleanedContent = cleanedContent.trim();

  return JSON.parse(cleanedContent);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "generate") {
      const config: QuizConfig = body.config;

      if (!config.topic || !config.questionCount || !config.questionTypes) {
        return NextResponse.json(
          { error: "Missing required config fields: topic, questionCount, questionTypes" },
          { status: 400 }
        );
      }

      // Validate percentages add up to 100
      const totalPercentage = config.questionTypes.trueFalse + config.questionTypes.multipleChoice + config.questionTypes.typed;
      if (totalPercentage !== 100) {
        return NextResponse.json(
          { error: `Question type percentages must add up to 100 (got ${totalPercentage})` },
          { status: 400 }
        );
      }

      const systemPrompt = GENERATE_QUIZ_PROMPT(config);
      const result = await callGroqAPI(systemPrompt);

      const quiz: Quiz = {
        id: crypto.randomUUID(),
        topic: config.topic,
        questions: result.questions,
        createdAt: new Date().toISOString(),
      };

      return NextResponse.json({ quiz });
    }

    if (action === "grade") {
      const { questions, answers } = body as { questions: QuizQuestion[]; answers: UserAnswer[] };

      if (!questions || !answers) {
        return NextResponse.json(
          { error: "Missing required fields: questions, answers" },
          { status: 400 }
        );
      }

      const systemPrompt = GRADE_QUIZ_PROMPT(questions, answers);
      const result = await callGroqAPI(systemPrompt, "Grade these answers now.");

      // Calculate score
      const feedbackList: QuestionFeedback[] = result.feedback.map((f: { questionId: number; isCorrect: boolean; feedback: string }) => {
        const question = questions.find(q => q.id === f.questionId);
        const userAnswer = answers.find(a => a.questionId === f.questionId);
        
        return {
          questionId: f.questionId,
          question: question?.question || "",
          userAnswer: userAnswer?.answer || "No answer",
          correctAnswer: question?.correctAnswer || "",
          isCorrect: f.isCorrect,
          feedback: f.feedback,
        };
      });

      const correctCount = feedbackList.filter(f => f.isCorrect).length;
      const quizResult: QuizResult = {
        quizId: body.quizId || "",
        score: correctCount,
        totalQuestions: questions.length,
        percentage: Math.round((correctCount / questions.length) * 100),
        feedback: feedbackList,
      };

      return NextResponse.json({ result: quizResult });
    }

    return NextResponse.json({ error: "Invalid action. Use 'generate' or 'grade'" }, { status: 400 });
  } catch (err) {
    console.error("Quiz API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
