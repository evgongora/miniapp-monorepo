import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface IdeologyScores {
  econ: number;
  dipl: number;
  govt: number;
  scty: number;
}

interface DeepSeekResponse {
  analysis: string;
}

interface ApiResponse {
  analysis?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const scores = body as IdeologyScores;
    const { econ, dipl, govt, scty } = scores;

    // Validate required fields
    if (!econ || !dipl || !govt || !scty) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate score ranges
    for (const [key, value] of Object.entries(scores)) {
      const score = Number(value);
      if (Number.isNaN(score) || score < 0 || score > 100) {
        return NextResponse.json(
          {
            error: `Invalid ${key} score. Must be a number between 0 and 100`,
          },
          { status: 400 },
        );
      }
    }

    const prompt = `[ROLE] Act as a senior political scientist specializing in ideological analysis. Address the user directly using "you/your" to personalize insights.  

[INPUT] Economic: ${econ} | Diplomatic: ${dipl} | Government: ${govt} | Social: ${scty} (All 0-100)  

[STRUCTURE] Return analysis in EXACTLY 5 sections using these headers:  
1. **Your Ideological Breakdown**  
2. **Your Closest Ideological Matches**  
3. **Your Likely Policy Preferences**  
4. **Your Key Philosophical Tensions**  
5. **Your Growth Opportunities**  

[REQUIREMENTS]  
1. **Breakdown**: Start each axis with "Your [Axis] score of [X] suggests..." and include:  
   - A concise descriptor (e.g., "regulated capitalism with a welfare focus").  
   - A real-world analogy (e.g., "similar to Sweden's mixed-market approach").  
   - A brief explanation of how this might manifest in your worldview.  

2. **Matches**: Compare to 2-3 real-world political movements/parties, using percentage alignments only for major frameworks. Highlight one area of divergence for each match.  

3. **Preferences**: Frame policies as "You would likely support..." with:  
   - A specific policy example (e.g., "universal childcare systems like Canada's 2023 Bill C-35").  
   - A brief rationale linking the policy to your scores.  

4. **Tensions**: Present contradictions as reflective questions, phrased as challenges you might face in real-world decision-making. Include one historical or contemporary example of how this tension has played out.  

5. **Growth**: Recommend:  
   - One academic resource tailored to your scores.  
   - One practical action step (e.g., joining a local advocacy group).  
   - One reflective exercise (e.g., "Write a short essay on how you would balance global cooperation with local autonomy").  

[CONSTRAINTS]  
- 600 words (±50)  
- AP Style  
- No markdown  
- Avoid passive voice  
- Explain technical terms parenthetically (e.g., "multilateralism (global cooperation)")  
- End with 2 open-ended reflection questions for the user  

Begin immediately with "1. Your Ideological Breakdown"`;

    const deepSeekResponse = await fetch(
      "https://api.deepseek.com/v1/analyze",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({ prompt }),
      },
    );

    if (!deepSeekResponse.ok) {
      const error = await deepSeekResponse.text();
      throw new Error(`DeepSeek API error: ${error}`);
    }

    const data = (await deepSeekResponse.json()) as DeepSeekResponse;
    const response: ApiResponse = { analysis: data.analysis };
    return NextResponse.json(response);
  } catch (error) {
    console.error("DeepSeek API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const response: ApiResponse = { error: message };
    return NextResponse.json(response, { status: 500 });
  }
}
