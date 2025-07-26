
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FileText, Code, Calendar } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface HistoryItem {
  id: string;
  type: 'workflow' | 'json';
  usecase: string;
  content: string;
  evaluation: any;
  score: number | null;
  created_at: string;
}

export const History = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      if (!user) return;

      try {
        // Fetch workflow submissions
        const { data: workflowData } = await supabase
          .from('workflow_submissions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        // Fetch JSON submissions
        const { data: jsonData } = await supabase
          .from('json_submissions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        // Combine and sort by date
        const combined: HistoryItem[] = [
          ...(workflowData || []).map(item => ({
            id: item.id,
            type: 'workflow' as const,
            usecase: item.usecase,
            content: item.workflow_text,
            evaluation: item.evaluation,
            score: item.score,
            created_at: item.created_at,
          })),
          ...(jsonData || []).map(item => ({
            id: item.id,
            type: 'json' as const,
            usecase: item.usecase,
            content: JSON.stringify(item.workflow_json, null, 2),
            evaluation: item.evaluation,
            score: item.score,
            created_at: item.created_at,
          })),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setHistory(combined);
      } catch (error) {
        console.error('Error loading history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [user]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="animate-pulse">Loading history...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">History</h1>
        <p className="text-gray-600 mb-8">View all your previous workflow and JSON submissions.</p>

        {history.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No submissions yet. Start by generating use cases!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {history.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    {item.type === 'workflow' ? (
                      <FileText className="w-5 h-5 text-blue-600 mr-2" />
                    ) : (
                      <Code className="w-5 h-5 text-green-600 mr-2" />
                    )}
                    <span className="font-medium text-gray-900 capitalize">
                      {item.type} Submission
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Use Case</h3>
                    <p className="text-gray-700 text-sm">{item.usecase}</p>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">
                      {item.type === 'workflow' ? 'Workflow Text' : 'JSON Content'}
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-32 overflow-y-auto">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                        {item.content.substring(0, 200)}
                        {item.content.length > 200 && '...'}
                      </pre>
                    </div>
                  </div>

                  {item.evaluation ? (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-4">Evaluation Results</h3>
                      
                      {/* Check if it's new format with score breakdown */}
                      {item.evaluation.scores ? (
                        <div className="space-y-4">
                          {/* Score Breakdown Table */}
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                            <h4 className="font-semibold text-blue-900 mb-4">Score Breakdown</h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-blue-900 font-medium">Criterion</TableHead>
                                  <TableHead className="text-blue-900 font-medium text-center">Score</TableHead>
                                  <TableHead className="text-blue-900 font-medium text-center">Max</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <TableRow>
                                  <TableCell className="text-blue-800">Clarity of Use Case</TableCell>
                                  <TableCell className="text-center text-blue-800 font-medium">{item.evaluation.scores.clarity}</TableCell>
                                  <TableCell className="text-center text-blue-600">10</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className="text-blue-800">Node Selection</TableCell>
                                  <TableCell className="text-center text-blue-800 font-medium">{item.evaluation.scores.nodeSelection}</TableCell>
                                  <TableCell className="text-center text-blue-600">10</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className="text-blue-800">Node Connectivity</TableCell>
                                  <TableCell className="text-center text-blue-800 font-medium">{item.evaluation.scores.connectivity}</TableCell>
                                  <TableCell className="text-center text-blue-600">10</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className="text-blue-800">Optimization & Simplicity</TableCell>
                                  <TableCell className="text-center text-blue-800 font-medium">{item.evaluation.scores.optimization}</TableCell>
                                  <TableCell className="text-center text-blue-600">10</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className="text-blue-800">Documentation & Naming</TableCell>
                                  <TableCell className="text-center text-blue-800 font-medium">{item.evaluation.scores.documentation}</TableCell>
                                  <TableCell className="text-center text-blue-600">10</TableCell>
                                </TableRow>
                                <TableRow className="border-t-2 border-blue-300">
                                  <TableCell className="text-blue-900 font-bold">Total Score</TableCell>
                                  <TableCell className="text-center text-blue-900 font-bold">{item.score}</TableCell>
                                  <TableCell className="text-center text-blue-900 font-bold">50</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>

                          {/* Final Verdict */}
                          {item.evaluation.verdict && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                              <h4 className="font-semibold text-blue-900 mb-3">Final Verdict</h4>
                              <p className="text-blue-800">{item.evaluation.verdict}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Fallback for old format */
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 className="font-medium text-green-900 mb-2">Correct</h4>
                            <p className="text-green-800 text-sm">
                              {typeof item.evaluation.correct === 'string' 
                                ? item.evaluation.correct 
                                : JSON.stringify(item.evaluation.correct)}
                            </p>
                          </div>
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <h4 className="font-medium text-red-900 mb-2">Missing</h4>
                            <p className="text-red-800 text-sm">
                              {typeof item.evaluation.lacking === 'string' 
                                ? item.evaluation.lacking 
                                : JSON.stringify(item.evaluation.lacking)}
                            </p>
                          </div>
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <h4 className="font-medium text-yellow-900 mb-2">Suggestions</h4>
                            <p className="text-yellow-800 text-sm">
                              {typeof item.evaluation.suggestions === 'string' 
                                ? item.evaluation.suggestions 
                                : JSON.stringify(item.evaluation.suggestions)}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Legacy score display for old format */}
                      {item.score && !item.evaluation.scores && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                          <span className="font-medium text-blue-900">Score: {item.score}/100</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-gray-600 text-sm">No evaluation available</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
