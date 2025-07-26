
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, FileText, Code, Calendar, Star, ChevronDown, ChevronRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface AdminSubmission {
  id: string;
  user_name: string;
  user_email: string;
  type: 'workflow' | 'json';
  usecase: string;
  content: string;
  score: number | null;
  evaluation: any;
  created_at: string;
}

export const AdminPanel = () => {
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);
  const [uniqueUsers, setUniqueUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();

        // Fetch workflow submissions from last 10 hours
        const { data: workflowData } = await supabase
          .from('workflow_submissions')
          .select(`
            id,
            usecase,
            workflow_text,
            score,
            evaluation,
            created_at,
            users (name, email)
          `)
          .gte('created_at', tenHoursAgo);

        // Fetch JSON submissions from last 10 hours
        const { data: jsonData } = await supabase
          .from('json_submissions')
          .select(`
            id,
            usecase,
            workflow_json,
            score,
            evaluation,
            created_at,
            users (name, email)
          `)
          .gte('created_at', tenHoursAgo);

        // Combine and format data
        const combined: AdminSubmission[] = [
          ...(workflowData || []).map(item => ({
            id: item.id,
            user_name: (item.users as any)?.name || 'Unknown',
            user_email: (item.users as any)?.email || 'Unknown',
            type: 'workflow' as const,
            usecase: item.usecase,
            content: item.workflow_text,
            score: item.score,
            evaluation: item.evaluation,
            created_at: item.created_at,
          })),
          ...(jsonData || []).map(item => ({
            id: item.id,
            user_name: (item.users as any)?.name || 'Unknown',
            user_email: (item.users as any)?.email || 'Unknown',
            type: 'json' as const,
            usecase: item.usecase,
            content: JSON.stringify(item.workflow_json, null, 2),
            score: item.score,
            evaluation: item.evaluation,
            created_at: item.created_at,
          })),
        ];

        // Sort by score (descending), then by date (ascending for tied scores)
        combined.sort((a, b) => {
          if (a.score !== b.score) {
            return (b.score || 0) - (a.score || 0);
          }
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

        setSubmissions(combined);

        // Calculate unique users
        const uniqueEmails = new Set(combined.map(item => item.user_email));
        setUniqueUsers(uniqueEmails.size);

      } catch (error) {
        console.error('Error loading admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAdminData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="animate-pulse">Loading admin data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
            <p className="text-gray-600">Monitor submissions from the past 10 hours</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Unique Users</p>
            <p className="text-2xl font-bold text-blue-600">{uniqueUsers}</p>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No submissions in the past 10 hours.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div key={submission.id} className="border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      {submission.type === 'workflow' ? (
                        <FileText className="w-5 h-5 text-blue-600 mr-2" />
                      ) : (
                        <Code className="w-5 h-5 text-green-600 mr-2" />
                      )}
                      <span className="font-medium text-gray-900 capitalize">
                        {submission.type} Submission
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      {new Date(submission.created_at).toLocaleDateString()}
                    </div>

                    {submission.score && (
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-500 mr-1" />
                        <span className="font-medium">
                          {submission.score}/{submission.evaluation?.scores ? '50' : '100'}
                        </span>
                      </div>
                    )}
                  </div>

                  {submission.evaluation && (
                    <button
                      onClick={() => toggleRow(submission.id)}
                      className="flex items-center text-blue-600 hover:text-blue-800"
                    >
                      {expandedRows.has(submission.id) ? (
                        <ChevronDown className="w-4 h-4 mr-1" />
                      ) : (
                        <ChevronRight className="w-4 h-4 mr-1" />
                      )}
                      View Evaluation
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">User</h4>
                    <p className="text-gray-700">{submission.user_name}</p>
                    <p className="text-sm text-gray-600">{submission.user_email}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Use Case</h4>
                    <p className="text-gray-700 text-sm">{submission.usecase}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Content Preview</h4>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-32 overflow-y-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {submission.content.substring(0, 200)}
                      {submission.content.length > 200 && '...'}
                    </pre>
                  </div>
                </div>

                {/* Expandable Evaluation Section */}
                {expandedRows.has(submission.id) && submission.evaluation && (
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-medium text-gray-900 mb-4">Evaluation Results</h4>
                    
                    {/* Check if it's new format with score breakdown */}
                    {submission.evaluation.scores ? (
                      <div className="space-y-4">
                        {/* Score Breakdown Table */}
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                          <h5 className="font-semibold text-blue-900 mb-4">Score Breakdown</h5>
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
                                <TableCell className="text-center text-blue-800 font-medium">{submission.evaluation.scores.clarity}</TableCell>
                                <TableCell className="text-center text-blue-600">10</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="text-blue-800">Node Selection</TableCell>
                                <TableCell className="text-center text-blue-800 font-medium">{submission.evaluation.scores.nodeSelection}</TableCell>
                                <TableCell className="text-center text-blue-600">10</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="text-blue-800">Node Connectivity</TableCell>
                                <TableCell className="text-center text-blue-800 font-medium">{submission.evaluation.scores.connectivity}</TableCell>
                                <TableCell className="text-center text-blue-600">10</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="text-blue-800">Optimization & Simplicity</TableCell>
                                <TableCell className="text-center text-blue-800 font-medium">{submission.evaluation.scores.optimization}</TableCell>
                                <TableCell className="text-center text-blue-600">10</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="text-blue-800">Documentation & Naming</TableCell>
                                <TableCell className="text-center text-blue-800 font-medium">{submission.evaluation.scores.documentation}</TableCell>
                                <TableCell className="text-center text-blue-600">10</TableCell>
                              </TableRow>
                              <TableRow className="border-t-2 border-blue-300">
                                <TableCell className="text-blue-900 font-bold">Total Score</TableCell>
                                <TableCell className="text-center text-blue-900 font-bold">{submission.score}</TableCell>
                                <TableCell className="text-center text-blue-900 font-bold">50</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>

                        {/* Final Verdict */}
                        {submission.evaluation.verdict && (
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                            <h5 className="font-semibold text-blue-900 mb-3">Final Verdict</h5>
                            <p className="text-blue-800">{submission.evaluation.verdict}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Fallback for old format */
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h5 className="font-medium text-green-900 mb-2">Correct</h5>
                          <p className="text-green-800 text-sm">
                            {typeof submission.evaluation.correct === 'string' 
                              ? submission.evaluation.correct 
                              : JSON.stringify(submission.evaluation.correct)}
                          </p>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <h5 className="font-medium text-red-900 mb-2">Missing</h5>
                          <p className="text-red-800 text-sm">
                            {typeof submission.evaluation.lacking === 'string' 
                              ? submission.evaluation.lacking 
                              : JSON.stringify(submission.evaluation.lacking)}
                          </p>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <h5 className="font-medium text-yellow-900 mb-2">Suggestions</h5>
                          <p className="text-yellow-800 text-sm">
                            {typeof submission.evaluation.suggestions === 'string' 
                              ? submission.evaluation.suggestions 
                              : JSON.stringify(submission.evaluation.suggestions)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
