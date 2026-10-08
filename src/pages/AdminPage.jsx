import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';
import { IcmuSmallLogo } from '../components/common/IcmuEmblem';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/motion/tabs';
import { Button } from '@/components/motion/button/base';
import { ApplicationsTab } from '../features/admin/components/ApplicationsTab';
import { SkillsTab } from '../features/admin/components/SkillsTab';
import { TeamsTab } from '../features/admin/components/TeamsTab';

export default function AdminPage() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('applications'); 

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="sticky top-0 z-50 bg-card border-b border-border/80 shadow-md">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IcmuSmallLogo className="w-8 h-8" />
            <span className="font-semibold text-sm tracking-wide text-gray-200">ICMU Admin Panel</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} variant="underline">
          <TabsList className="flex gap-4 mb-8 border-b border-border/80 pb-px w-full justify-start">
            <TabsTrigger value="applications" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">
              Applications
            </TabsTrigger>
            <TabsTrigger value="skills" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">
              Skills
            </TabsTrigger>
            <TabsTrigger value="teams" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">
              Teams
            </TabsTrigger>
          </TabsList>

          <TabsContent value="applications">
            <ApplicationsTab />
          </TabsContent>

          <TabsContent value="skills">
            <SkillsTab />
          </TabsContent>

          <TabsContent value="teams">
            <TeamsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
