"use client";
import { useState } from 'react';
import LandingOverlay from '@/components/layout/LandingOverlay';
import DesignWorkspace from '@/components/layout/DesignWorkspace';

export default function Home() {
  const [viewState, setViewState] = useState<'LANDING' | 'DESIGN'>('LANDING');

  return (
    <main className="min-h-screen bg-slate-900 font-sans text-slate-100 overflow-hidden" dir="rtl">

      {/* View Switcher */}
      {viewState === 'LANDING' ? (
        <LandingOverlay onStartDesign={() => setViewState('DESIGN')} />
      ) : (
        <DesignWorkspace />
      )}

    </main>
  );
}
