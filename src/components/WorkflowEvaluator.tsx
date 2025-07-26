import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Lightbulb } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
export const WorkflowEvaluator = () => {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [useCases, setUseCases] = useState<string[]>([]);
  const [selectedUseCase, setSelectedUseCase] = useState('');
  const [customUseCase, setCustomUseCase] = useState('');
  const [workflowText, setWorkflowText] = useState('');
  const [evaluation, setEvaluation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    // Load available use cases
    const loadUseCases = async () => {
      if (user) {
        const {
          data
        } = await supabase.from('usecases').select('generated_usecases').eq('user_id', user.id).order('created_at', {
          ascending: false
        }).limit(1);
        if (data && data.length > 0) {
          setUseCases(data[0].generated_usecases as string[]);
        }
      }
    };

    // Load saved workflow data
    const loadSavedData = async () => {
      if (user) {
        const {
          data
        } = await supabase.from('workflow_submissions').select('*').eq('user_id', user.id).order('created_at', {
          ascending: false
        }).limit(1);
        if (data && data.length > 0) {
          const latest = data[0];
          setSelectedUseCase(latest.usecase);
          setWorkflowText(latest.workflow_text);
          setEvaluation(latest.evaluation);
        }
      }
    };
    loadUseCases();
    loadSavedData();
  }, [user]);
  const evaluateWorkflow = async () => {
    const useCase = selectedUseCase === 'custom' ? customUseCase : selectedUseCase;
    if (!useCase || !workflowText) {
      toast({
        title: "Error",
        description: "Please select a use case and enter your workflow.",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('evaluate-workflow', {
        body: {
          useCase,
          workflowText
        }
      });
      if (error) throw error;
      setEvaluation(data.evaluation);

      // Save to database
      await supabase.from('workflow_submissions').insert({
        user_id: user?.id,
        usecase: useCase,
        workflow_text: workflowText,
        evaluation: data.evaluation,
        score: data.evaluation.totalScore || 0
      });
      toast({
        title: "Success!",
        description: "Workflow evaluated successfully."
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to evaluate workflow.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Workflow Evaluator</h1>
        <p className="text-gray-600 mb-8">Evaluate your workflow process against selected use cases.</p>

        <div className="space-y-6">
          <div>
            <label htmlFor="usecase" className="block text-sm font-medium text-gray-700 mb-2">
              Select Use Case <span className="text-red-500">*</span>
            </label>
            <select id="usecase" value={selectedUseCase} onChange={e => setSelectedUseCase(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
              <option value="" disabled>Select a use case...</option>
              {useCases.map((useCase, index) => <option key={index} value={useCase}>
                  Use Case {index + 1}: {useCase.substring(0, 50)}...
                </option>)}
              <option value="custom">Custom Use Case</option>
            </select>
          </div>

          {selectedUseCase === 'custom' && <div>
              <label htmlFor="customUseCase" className="block text-sm font-medium text-gray-700 mb-2">
                Custom Use Case
              </label>
              <input id="customUseCase" type="text" value={customUseCase} onChange={e => setCustomUseCase(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter your custom use case" />
            </div>}

          <div>
            <label htmlFor="workflowText" className="block text-sm font-medium text-gray-700 mb-2">
              Workflow Process (Text Format)
            </label>
            <textarea id="workflowText" value={workflowText} onChange={e => setWorkflowText(e.target.value)} rows={8} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Describe your workflow process step by step..." />
          </div>

          <button onClick={evaluateWorkflow} disabled={loading || !selectedUseCase} className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50">
            {loading ? 'Evaluating...' : 'Evaluate Workflow'}
          </button>
        </div>

        {evaluation && <div className="mt-8 space-y-6">
            {evaluation.matched === false}
            
            <h2 className="text-xl font-semibold text-gray-900">Evaluation Results</h2>
            
            

            {evaluation.scores && <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="font-medium text-blue-900 mb-4">Score Breakdown</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Criterion</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Max Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Clarity of Use Case</TableCell>
                      <TableCell>{evaluation.scores.clarityOfUseCase || 0}</TableCell>
                      <TableCell>10</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Node Selection</TableCell>
                      <TableCell>{evaluation.scores.nodeSelection || 0}</TableCell>
                      <TableCell>10</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Node Connectivity</TableCell>
                      <TableCell>{evaluation.scores.nodeConnectivity || 0}</TableCell>
                      <TableCell>10</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Optimization & Simplicity</TableCell>
                      <TableCell>{evaluation.scores.optimizationSimplicity || 0}</TableCell>
                      <TableCell>10</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Documentation & Naming Clarity</TableCell>
                      <TableCell>{evaluation.scores.documentationNaming || 0}</TableCell>
                      <TableCell>10</TableCell>
                    </TableRow>
                    <TableRow className="font-semibold bg-blue-100">
                      <TableCell>Total Score</TableCell>
                      <TableCell>{evaluation.totalScore || 0}</TableCell>
                      <TableCell>50</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                {evaluation.verdict && <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-1">Final Verdict:</h4>
                    <p className="text-blue-800 text-sm">{evaluation.verdict}</p>
                  </div>}
              </div>}
          </div>}
      </div>
    </div>;
};