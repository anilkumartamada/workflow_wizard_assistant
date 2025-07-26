
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
    const { department, task } = await req.json();

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
            content: 'You are an expert in workflow automation and n8n. Generate exactly 4 practical use cases for workflow automation based on the given department and task. Each use case should be specific, actionable, and suitable for n8n implementation. Return your response as a JSON array of strings, with each string being a complete use case description.'
          },
          {
            role: 'user',
            content: `Department: ${department}\nTask: ${task}\n\nGenerate 4 specific workflow automation use cases that would be relevant for this department and task.`
          }
        ],
        temperature: 0.8,
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    const useCasesText = data.choices[0].message.content;
    
    // Try to parse as JSON, fallback to text parsing
    let useCases;
    try {
      useCases = JSON.parse(useCasesText);
    } catch {
      // Fallback: split by numbered list
      useCases = useCasesText
        .split(/\d+\./)
        .slice(1)
        .map((item: string) => item.trim())
        .filter((item: string) => item.length > 0)
        .slice(0, 4);
    }

    return new Response(JSON.stringify({ useCases }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-usecases function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
