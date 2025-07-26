
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Home, 
  FileText, 
  Settings, 
  Code, 
  History, 
  Shield,
  LogOut,
  User
} from 'lucide-react';

const menuItems = [
  { id: 'usecases', label: 'Use Case Generator', icon: FileText },
  { id: 'workflow', label: 'Workflow Evaluator', icon: Settings },
  { id: 'json', label: 'JSON Analyzer', icon: Code },
  { id: 'history', label: 'History', icon: History },
];

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar = ({ activeTab, setActiveTab }: SidebarProps) => {
  const { user, signOut } = useAuth();
  const [userRole, setUserRole] = useState<string>('user');

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (data?.role) {
          setUserRole(data.role);
        }
      }
    };

    fetchUserRole();
  }, [user]);

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg border-r border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">n8n Bootcamp</h1>
        <p className="text-sm text-gray-600 mt-1">Assistant</p>
      </div>

      <nav className="mt-6">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center px-6 py-3 text-left hover:bg-blue-50 transition-colors ${
              activeTab === item.id ? 'bg-blue-50 border-r-2 border-blue-500 text-blue-700' : 'text-gray-700'
            }`}
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.label}
          </button>
        ))}
        
        {userRole === 'admin' && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`w-full flex items-center px-6 py-3 text-left hover:bg-blue-50 transition-colors ${
              activeTab === 'admin' ? 'bg-blue-50 border-r-2 border-blue-500 text-blue-700' : 'text-gray-700'
            }`}
          >
            <Shield className="w-5 h-5 mr-3" />
            Admin Panel
          </button>
        )}
      </nav>

      <div className="absolute bottom-0 w-full p-6 border-t border-gray-200">
        <div className="flex items-center mb-4">
          <User className="w-8 h-8 text-gray-400 mr-3" />
          <div>
            <p className="text-sm font-medium text-gray-900">{user?.email}</p>
            <p className="text-xs text-gray-500 capitalize">{userRole}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </button>
      </div>
    </div>
  );
};
