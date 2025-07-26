
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
    console.log('Generate use cases function called');
    
    if (!openAIApiKey) {
      console.error('OpenAI API key not found');
      throw new Error('OpenAI API key not configured');
    }

    const { department, task } = await req.json();
    console.log('Department:', department, 'Task:', task);

    if (!department || !task) {
      throw new Error('Department and task are required');
    }

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
            content: `You are an expert in workflow automation and n8n. Generate exactly 4 DISTINCT and DIFFERENT practical use cases for workflow automation based on the given department and task. Each use case MUST be unique, specific, actionable, and suitable for n8n implementation. 

IMPORTANT: Return ONLY a JSON array of exactly 4 strings. Each string should be a complete, different use case description. Do not include any other text, explanations, or formatting.

Example format: ["Use case 1 description", "Use case 2 description", "Use case 3 description", "Use case 4 description"]

Make sure each use case covers a different aspect or workflow within the department and task area.



**Team Responsibilities Reference (for use by AI):**

**Product Design**  
- Creating wireframes and prototypes  
- Collaborating with engineering/product teams  
- Presenting designs to stakeholders  
- Building and maintaining design systems  
- Conducting user research (interviews, usability tests)

**Program Management**  
- Managing admissions processes and campus deployments  
- Onboarding and training BOAs/PMAs/PMs  
- Tracking progress of new hires  
- Coordinating logistics for campus readiness  
- Regularly updating stakeholders  

**Accounting**  
- Recording transactions in ERP  
- Invoice validation and payment reconciliation  
- Preparing budgets and analyzing spending  
- Processing refunds  
- Filing statutory returns (GST, TDS, etc.)

**Content Team**  
- Writing web copy and microcopy  
- Creating scripts, brochures, social media posts  
- Translating/localizing assets  
- Drafting email newsletters and presentation decks  
- Video subtitle writing and influencer content scripting`
          },
          {
            role: 'user',
            content: `Department: ${department}\nTask: ${task}\n\nGenerate 4 DISTINCT workflow automation use cases that would be relevant for this department and task. Each use case must be different and cover different aspects of the work.`
          }
        ],
        temperature: 0.8,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('OpenAI response:', data);
    
    if (data.error) {
      console.error('OpenAI error:', data.error);
      throw new Error(data.error.message);
    }

    const useCasesText = data.choices[0].message.content;
    console.log('Generated use cases text:', useCasesText);
    
    // Try to parse as JSON, fallback to text parsing
    let useCases;
    try {
      useCases = JSON.parse(useCasesText);
      if (!Array.isArray(useCases)) {
        throw new Error('Response is not an array');
      }
    } catch (parseError) {
      console.log('JSON parse failed, using text parsing fallback');
      // Fallback: split by numbered list or bullet points
      useCases = useCasesText
        .split(/(?:\d+\.|\*|\-)\s+/)
        .slice(1)
        .map((item: string) => item.trim())
        .filter((item: string) => item.length > 0)
        .slice(0, 4);
    }

    // Ensure we have exactly 4 use cases
    if (useCases.length < 4) {
      // If we don't have enough, generate simple ones
      while (useCases.length < 4) {
        useCases.push(`Automate ${task.toLowerCase()} workflow for ${department} department`);
      }
    }

    console.log('Final use cases:', useCases);

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
