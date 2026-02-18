import { NextResponse } from "next/server";
import type { QuizConfig, Quiz, QuizQuestion, UserAnswer, QuizResult, QuestionFeedback, QuizStyle } from "@/types/Quiz.type";

const getStyleInstructions = (style: QuizStyle): string => {
  switch (style) {
    case "knowledge":
      return `FORCED STYLE: KNOWLEDGE/TRIVIA QUIZ
You MUST generate factual questions testing understanding of the subject.
Questions should have objectively correct answers based on facts.
Do NOT generate self-assessment or opinion questions.`;
    case "self-assessment":
      return `FORCED STYLE: SELF-ASSESSMENT/SCREENING QUIZ
You MUST generate questions that ask about the USER'S OWN experiences, feelings, behaviors, and traits.
Questions should be first-person: "Do YOU often...", "Have YOU ever...", "When YOU are in a situation..."
These are NOT knowledge questions - they're introspective questions about the quiz-taker.
For "correctAnswer", use typical indicator responses (but note this is not a diagnosis).`;
    case "opinion":
      return `FORCED STYLE: OPINION/PREFERENCE QUIZ
You MUST generate questions about what the user prefers, thinks, or feels about topics.
There are no objectively "correct" answers - just options.
Use the "correctAnswer" field to store a reasonable/common response.`;
    case "auto":
    default:
      return `AUTO-DETECT STYLE:
Analyze the user's request to determine what kind of quiz they want:

A) SELF-ASSESSMENT/SCREENING - If they mention "do I have", "am I", "screening", "test myself", "find out if I", "personality", etc.
   → Generate first-person introspective questions about the user's behaviors/feelings

B) KNOWLEDGE/TRIVIA - If they want to test knowledge ABOUT a topic
   → Generate factual questions with objectively correct answers

C) OPINION/PREFERENCE - If they want to explore preferences
   → Generate questions about what the user prefers or thinks`;
  }
};

const getDifficultyInstructions = (difficulty: string): string => {
  switch (difficulty) {
    case "easy":
      return "DIFFICULTY: Generate EASY questions. Use simple vocabulary, straightforward concepts, and commonly known facts.";
    case "medium":
      return "DIFFICULTY: Generate MEDIUM difficulty questions. Balance between accessible and challenging content.";
    case "hard":
      return "DIFFICULTY: Generate HARD questions. Use advanced concepts, nuanced details, and less commonly known information.";
    case "mixed":
    default:
      return "DIFFICULTY: Generate a MIX of easy, medium, and hard questions throughout the quiz.";
  }
};

const GENERATE_QUIZ_PROMPT = (config: QuizConfig) => {
  const { topic, questionCount, questionTypes, aiSettings } = config;
  
  // Calculate how many of each type
  const trueFalseCount = Math.round((questionTypes.trueFalse / 100) * questionCount);
  const multipleChoiceCount = Math.round((questionTypes.multipleChoice / 100) * questionCount);
  const typedCount = questionCount - trueFalseCount - multipleChoiceCount;
  
  const styleInstructions = getStyleInstructions(aiSettings?.style || "auto");
  const difficultyInstructions = getDifficultyInstructions(aiSettings?.difficulty || "medium");

  return {
    role: "system",
    content: `You are an intelligent quiz generator.

USER'S REQUEST: "${topic}"

${styleInstructions}

${difficultyInstructions}

Create exactly ${questionCount} questions.

Question distribution:
- True/False questions: ${trueFalseCount}
- Multiple Choice questions (4 options each): ${multipleChoiceCount}  
- Typed answer questions (short answer): ${typedCount}

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanation.

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

CRITICAL RULES:
- FOLLOW THE STYLE INSTRUCTIONS ABOVE - this is the most important rule
- Each question must have a unique sequential id starting from 1
- Multiple choice must have exactly 4 options
- True/False must have options ["True", "False"]
- Typed questions should have short, clear expected answers (1-3 words ideally)
- correctAnswer must exactly match one of the options (for true-false and multiple-choice)
- Generate DIVERSE and UNIQUE questions - do not repeat similar questions
- Questions should be appropriate for general audiences
- Return ONLY the JSON object, nothing else`
  };
};

const GRADE_QUIZ_PROMPT = (questions: QuizQuestion[], answers: UserAnswer[], quizStyle: string = "knowledge") => {
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

  const isSelfAssessment = quizStyle === "self-assessment";

  if (isSelfAssessment) {
    return {
      role: "system",
      content: `You are a compassionate psychological assessment interpreter. This is a SELF-ASSESSMENT quiz where the user answered questions about their own experiences and traits. There are NO right or wrong answers - only insights.

Quiz Responses:
${JSON.stringify(questionsWithAnswers, null, 2)}

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks. This is a self-assessment, NOT a knowledge test.

Return this exact JSON structure:
{
  "feedback": [
    {
      "questionId": 1,
      "isCorrect": true,
      "feedback": "Brief insight about what this response might indicate. Be supportive and non-judgmental."
    }
  ],
  "likelihoodPercentage": 65,
  "summary": "A thoughtful 2-4 sentence paragraph summarizing the overall assessment results..."
}

Rules for self-assessment grading:
- Set "isCorrect" to true for ALL answers (there are no wrong answers in self-assessment)
- The "feedback" should provide insight, not judgment (e.g., "This response suggests you may often feel..." not "Correct!")
- "likelihoodPercentage" is a number 0-100 representing how strongly the responses align with typical indicators of the assessed trait/condition
  - 0-30: Few indicators present
  - 31-50: Some indicators present  
  - 51-70: Moderate indicators present
  - 71-85: Strong indicators present
  - 86-100: Very strong indicators present
- Be warm, supportive, and non-clinical in tone
- The "summary" MUST be included and should synthesize the overall picture
- Never diagnose - use phrases like "may indicate", "suggests", "could reflect"
- End the summary with a brief note encouraging professional consultation if they have concerns
- Return ONLY the JSON object, nothing else`
    };
  }

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

async function callGroqAPI(systemPrompt: { role: string; content: string }, userMessage?: string, temperature: number = 0.7) {
  const messages = userMessage 
    ? [systemPrompt, { role: "user", content: userMessage }]
    : [systemPrompt, { role: "user", content: "Generate the quiz now based on my request." }];

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature,
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

      // Calculate temperature from creativity (10-100 maps to 0.1-1.0)
      const creativity = config.aiSettings?.creativity ?? 50;
      const temperature = Math.max(0.1, Math.min(1.0, creativity / 100));

      const systemPrompt = GENERATE_QUIZ_PROMPT(config);
      const result = await callGroqAPI(systemPrompt, undefined, temperature);

      const quiz: Quiz = {
        id: crypto.randomUUID(),
        topic: config.topic,
        questions: result.questions,
        createdAt: new Date().toISOString(),
      };

      return NextResponse.json({ quiz });
    }

    if (action === "grade") {
      const { questions, answers, quizStyle } = body as { questions: QuizQuestion[]; answers: UserAnswer[]; quizStyle?: string };

      if (!questions || !answers) {
        return NextResponse.json(
          { error: "Missing required fields: questions, answers" },
          { status: 400 }
        );
      }

      const systemPrompt = GRADE_QUIZ_PROMPT(questions, answers, quizStyle || "knowledge");
      const result = await callGroqAPI(systemPrompt, "Grade these answers now.");

      const isSelfAssessment = quizStyle === "self-assessment";

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
          options: question?.options,
          type: question?.type || "typed",
        };
      });

      const correctCount = feedbackList.filter(f => f.isCorrect).length;
      const quizResult: QuizResult = {
        quizId: body.quizId || "",
        score: correctCount,
        totalQuestions: questions.length,
        percentage: isSelfAssessment 
          ? (result.likelihoodPercentage ?? 50) 
          : Math.round((correctCount / questions.length) * 100),
        feedback: feedbackList,
        quizStyle: quizStyle as QuizStyle | undefined,
        summary: result.summary,
      };

      return NextResponse.json({ result: quizResult });
    }

    return NextResponse.json({ error: "Invalid action. Use 'generate' or 'grade'" }, { status: 400 });
  } catch (err) {
    console.error("Quiz API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
