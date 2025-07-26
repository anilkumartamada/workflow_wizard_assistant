
import { useState } from 'react';
import { UseCaseGenerator } from './UseCaseGenerator';
import { WorkflowEvaluator } from './WorkflowEvaluator';
import { JsonAnalyzer } from './JsonAnalyzer';
import { History } from './History';
import { AdminPanel } from './AdminPanel';
import { Sidebar } from './Sidebar';

export const TabManager = () => {
  const [activeTab, setActiveTab] = useState('usecases');

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'usecases':
        return <UseCaseGenerator />;
      case 'workflow':
        return <WorkflowEvaluator />;
      case 'json':
        return <JsonAnalyzer />;
      case 'history':
        return <History />;
      case 'admin':
        return <AdminPanel />;
      default:
        return <UseCaseGenerator />;
    }
  };

  return (
    <div className="flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="ml-64 flex-1 p-8">
        {renderActiveTab()}
      </div>
    </div>
  );
};
