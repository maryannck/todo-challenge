import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { TaskBoard } from './components/TaskBoard';
import { LogOut, CheckSquare } from 'lucide-react';

const queryClient = new QueryClient();

const MainDashboard: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <AuthModal />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg">
            <CheckSquare className="w-5 h-5" />
          </div>
          <span className="font-semibold text-base tracking-tight">TaskFlow</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400">{user?.email}</span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-200 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 mt-4">
        <TaskBoard />
      </main>
    </div>
  );
};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MainDashboard />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
