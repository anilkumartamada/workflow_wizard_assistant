import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Lightbulb, Upload, Eye, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
export const JsonAnalyzer = () => {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [useCases, setUseCases] = useState<string[]>([]);
  const [selectedUseCase, setSelectedUseCase] = useState('');
  const [customUseCase, setCustomUseCase] = useState('');
  const [jsonData, setJsonData] = useState<any>(null);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showJsonViewer, setShowJsonViewer] = useState(false);
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

    // Load saved JSON data
    const loadSavedData = async () => {
      if (user) {
        const {
          data
        } = await supabase.from('json_submissions').select('*').eq('user_id', user.id).order('created_at', {
          ascending: false
        }).limit(1);
        if (data && data.length > 0) {
          const latest = data[0];
          setSelectedUseCase(latest.usecase);
          setJsonData(latest.workflow_json);
          setEvaluation(latest.evaluation);
        }
      }
    };
    loadUseCases();
    loadSavedData();
  }, [user]);
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const json = JSON.parse(e.target?.result as string);
        setJsonData(json);
        toast({
          title: "Success!",
          description: "JSON file uploaded successfully."
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Invalid JSON file.",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
  };
  const evaluateJson = async () => {
    const useCase = selectedUseCase === 'custom' ? customUseCase : selectedUseCase;
    if (!useCase || !jsonData) {
      toast({
        title: "Error",
        description: "Please select a use case and upload a JSON file.",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('evaluate-json', {
        body: {
          useCase,
          jsonData
        }
      });
      if (error) throw error;
      setEvaluation(data.evaluation);

      // Save to database
      await supabase.from('json_submissions').insert({
        user_id: user?.id,
        usecase: useCase,
        workflow_json: jsonData,
        evaluation: data.evaluation,
        score: data.evaluation.totalScore || data.evaluation.score
      });
      toast({
        title: "Success!",
        description: "JSON workflow evaluated successfully."
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to evaluate JSON workflow.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const renderSuggestions = (suggestions: any) => {
    if (typeof suggestions === 'string') {
      // If it's a string, split by newlines or other delimiters
      return suggestions.split(/\n|;|\.|•/).filter(item => item.trim().length > 0).map((suggestion, index) => <li key={index}>{suggestion.trim()}</li>);
    } else if (Array.isArray(suggestions)) {
      // If it's an array, render each item
      return suggestions.map((suggestion, index) => <li key={index}>{typeof suggestion === 'string' ? suggestion : JSON.stringify(suggestion)}</li>);
    } else if (typeof suggestions === 'object' && suggestions !== null) {
      // If it's an object, try to extract meaningful text
      const suggestionText = JSON.stringify(suggestions, null, 2);
      return [<li key={0}>{suggestionText}</li>];
    } else {
      // Fallback for any other type
      return [<li key={0}>{String(suggestions)}</li>];
    }
  };
  return <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">JSON Analyzer</h1>
        <p className="text-gray-600 mb-8">Analyze your workflow JSON against selected use cases.</p>

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
            <label htmlFor="jsonFile" className="block text-sm font-medium text-gray-700 mb-2">
              Upload JSON File
            </label>
            <div className="flex items-center space-x-4">
              <input id="jsonFile" type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              <label htmlFor="jsonFile" className="flex items-center px-4 py-3 border border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                <Upload className="w-4 h-4 mr-2" />
                Choose JSON File
              </label>
              {jsonData && <>
                  <span className="text-sm text-green-600">✓ JSON file loaded</span>
                  <button onClick={() => setShowJsonViewer(true)} className="flex items-center px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </button>
                </>}
            </div>
          </div>

          <button onClick={evaluateJson} disabled={loading || !selectedUseCase || !jsonData} className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50">
            {loading ? 'Analyzing...' : 'Analyze JSON'}
          </button>
        </div>

        {evaluation && <div className="mt-8 space-y-6">
            {evaluation.matched === false}

            <h2 className="text-xl font-semibold text-gray-900">Evaluation Results</h2>
            
            

            {evaluation.scores && <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-blue-900 mb-4">Score Breakdown</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Criteria</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Clarity of Use Case</TableCell>
                      <TableCell className="text-right">{evaluation.scores.clarityOfUseCase || 0}/10</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Node Selection</TableCell>
                      <TableCell className="text-right">{evaluation.scores.nodeSelection || 0}/10</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Node Connectivity</TableCell>
                      <TableCell className="text-right">{evaluation.scores.nodeConnectivity || 0}/10</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Optimization & Simplicity</TableCell>
                      <TableCell className="text-right">{evaluation.scores.optimizationSimplicity || 0}/10</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Documentation & Naming Clarity</TableCell>
                      <TableCell className="text-right">{evaluation.scores.documentationNaming || 0}/10</TableCell>
                    </TableRow>
                    <TableRow className="border-t-2 font-semibold">
                      <TableCell>Total Score</TableCell>
                      <TableCell className="text-right">{evaluation.totalScore || evaluation.score || 0}/50</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                
                {evaluation.verdict && <div className="mt-4 p-4 bg-blue-100 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Final Verdict</h4>
                    <p className="text-blue-800">{evaluation.verdict}</p>
                  </div>}
              </div>}
          </div>}

        {/* JSON Viewer Modal */}
        {showJsonViewer && jsonData && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-4xl max-h-[80vh] overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">JSON File Content</h3>
                <button onClick={() => setShowJsonViewer(false)} className="text-gray-500 hover:text-gray-700">
                  ✕
                </button>
              </div>
              <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
                {JSON.stringify(jsonData, null, 2)}
              </pre>
            </div>
          </div>}
      </div>
    </div>;
};