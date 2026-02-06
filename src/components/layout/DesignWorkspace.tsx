"use client";

import { useState } from "react";
import SmartMannequin from "@/components/SmartMannequin";
import AssistantControl from "@/components/AssistantControl";
import TimeMachine from "@/components/TimeMachine";
import DesignToolsPanel from "@/components/design/DesignToolsPanel";
import OptionsSidebar from "@/components/design/OptionsSidebar";

export default function DesignWorkspace() {
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    return (
        <section className="relative w-full h-full bg-slate-900 flex items-center justify-center overflow-hidden">

            {/* Background Grid */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
            </div>

            {/* Floating Design Tools Bar (Top Center) */}
            <DesignToolsPanel
                activeCategory={activeCategory}
                onSelectCategory={setActiveCategory}
            />

            {/* Main Visualizer */}
            <div className="relative z-10 scale-110 transition-all duration-500 pt-32"
                style={{ marginRight: activeCategory ? '320px' : '0' }}> {/* Shift left when sidebar opens */}
                <SmartMannequin />
            </div>

            {/* Right Sidebar (Options) */}
            <OptionsSidebar
                activeCategory={activeCategory}
                onClose={() => setActiveCategory(null)}
            />

            {/* Floating Tools (Global) */}
            <div className="absolute top-6 right-6 z-30">
                <TimeMachine />
            </div>

            <div className="absolute bottom-6 left-6 z-30">
                <AssistantControl />
            </div>

        </section>
    );
}
