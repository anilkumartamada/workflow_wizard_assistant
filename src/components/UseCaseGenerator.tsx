
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export const UseCaseGenerator = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [department, setDepartment] = useState('');
  const [task, setTask] = useState('');
  const [useCases, setUseCases] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load saved data
    const loadSavedData = async () => {
      if (user) {
        const { data } = await supabase
          .from('usecases')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (data && data.length > 0) {
          const latest = data[0];
          setDepartment(latest.department);
          setTask(latest.task);
          setUseCases(latest.generated_usecases as string[]);
        }
      }
    };

    loadSavedData();
  }, [user]);

  const generateUseCases = async () => {
    if (!department || !task) {
      toast({
        title: "Error",
        description: "Please fill in both department and task fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-usecases', {
        body: { department, task }
      });

      if (error) throw error;
      
      // Ensure each use case is a single, clean string
      const cleanedUseCases = data.useCases.map((useCase: string) => {
        // Remove any numbered prefixes, bullet points, or extra formatting
        return useCase
          .replace(/^\d+\.\s*/, '') // Remove "1. ", "2. ", etc.
          .replace(/^\*\s*/, '')    // Remove "* "
          .replace(/^-\s*/, '')     // Remove "- "
          .trim();
      }).filter((useCase: string) => useCase.length > 0);

      setUseCases(cleanedUseCases);

      // Save to database
      await supabase.from('usecases').insert({
        user_id: user?.id,
        department,
        task,
        generated_usecases: cleanedUseCases,
      });

      toast({
        title: "Success!",
        description: "Use cases generated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate use cases.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Use Case Generator</h1>
        <p className="text-gray-600 mb-8">Generate workflow automation use cases based on your department and tasks.</p>

        <div className="space-y-6 mb-8">
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <input
              id="department"
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Marketing, HR, Finance"
            />
          </div>

          <div>
            <label htmlFor="task" className="block text-sm font-medium text-gray-700 mb-2">
              Task
            </label>
            <Textarea
              id="task"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[120px] resize-y"
              placeholder="e.g., Lead management, Employee onboarding, Data processing workflows, Customer support automation"
            />
          </div>
        </div>

        <button
          onClick={generateUseCases}
          disabled={loading}
          className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Generating...' : useCases.length > 0 ? 'Regenerate Use Cases' : 'Generate Use Cases'}
        </button>

        {useCases.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Generated Use Cases</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {useCases.map((useCase, index) => (
                <div key={index} className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Use Case {index + 1}</h3>
                  <p className="text-blue-800 text-sm leading-relaxed">{useCase}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
