
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { useCase, jsonData } = await req.json();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a workflow evaluator for n8n-based automation systems. The user will give you a use case and their n8n JSON workflow. Your task is to: 1. Understand the use case 2. Analyze their JSON workflow step by step 3. Identify what they did well 4. Point out areas for improvement 5. Give a score out of 50 based on the following criteria: - Clarity of Use Case (10 points) - Node Selection (10 points) - Node Connectivity (10 points) - Optimization & Simplicity (10 points) - Documentation & Naming Clarity (10 points). Always provide evaluation feedback regardless of whether the workflow matches the use case. IMPORTANT: You MUST return ONLY a valid JSON object with no additional text. The JSON must have these exact fields: "matched" (boolean), "correct" (string - what they did well), "lacking" (string - areas for improvement), "suggestions" (string - constructive recommendations), "scores" (object with clarityOfUseCase, nodeSelection, nodeConnectivity, optimizationSimplicity, documentationNaming as numbers), "totalScore" (number - sum out of 50), and "verdict" (string - final short assessment). If the workflow doesn\'t match the use case, set matched to false but still provide constructive feedback.'
          },
          {
            role: 'user',
            content: `Use Case: ${useCase}\n\nn8n Workflow JSON: ${JSON.stringify(jsonData, null, 2)}\n\nEvaluate this n8n JSON workflow against the use case. Provide detailed evaluation with scores for each criterion and a table breakdown, regardless of whether they match perfectly. If the workflow doesn't match the use case, mention this in your evaluation but still provide constructive feedback on the workflow itself.`
          }
        ],
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    const evaluationText = data.choices[0].message.content;
    
    // Try to parse as JSON with better error handling
    let evaluation;
    try {
      // Clean the response text - remove any markdown formatting or extra text
      let cleanedText = evaluationText.trim();
      
      // If the response is wrapped in markdown code blocks, extract the JSON
      if (cleanedText.includes('```json')) {
        const jsonMatch = cleanedText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          cleanedText = jsonMatch[1].trim();
        }
      } else if (cleanedText.includes('```')) {
        const jsonMatch = cleanedText.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          cleanedText = jsonMatch[1].trim();
        }
      }
      
      // Find JSON object in the text
      const jsonStart = cleanedText.indexOf('{');
      const jsonEnd = cleanedText.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
      }
      
      evaluation = JSON.parse(cleanedText);
      
      // Validate required fields
      if (!evaluation.scores || typeof evaluation.totalScore !== 'number') {
        throw new Error('Invalid evaluation structure');
      }
      
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Failed to parse text:', evaluationText);
      
      // Fallback structure if JSON parsing fails
      evaluation = {
        matched: false,
        correct: "Evaluation attempted but parsing failed",
        lacking: "Technical issue prevented detailed analysis",
        suggestions: "Please try submitting your workflow again",
        scores: {
          clarityOfUseCase: 7,
          nodeSelection: 7,
          nodeConnectivity: 7,
          optimizationSimplicity: 7,
          documentationNaming: 7
        },
        totalScore: 35,
        verdict: "Evaluation completed with technical limitations - please retry for detailed feedback"
      };
    }

    return new Response(JSON.stringify({ evaluation }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in evaluate-json function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
