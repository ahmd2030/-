"use client";
import { useState, useRef } from 'react';
import { Mic, StopCircle } from 'lucide-react';
import { useMerchantStore } from '@/store/merchantStore';
import { processVoiceCommand } from '@/services/ai';

export default function AssistantControl() {
    const [isListening, setIsListening] = useState(false);
    const [reply, setReply] = useState("");
    const { design, setDesign } = useMerchantStore();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);

    const startListening = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setReply("المتصفح لا يدعم التعرف الصوتي.");
            return;
        }

        // @ts-expect-error - specific browser support for SpeechRecognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = 'ar-SA';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            setIsListening(true);
            setReply("جاري الاستماع... (تحدث الآن)");
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = async (event: any) => {
            const transcript = event.results[0][0].transcript;
            setReply(`⏳ جاري التفكير: "${transcript}"`);

            // Call AI Service
            const aiResponse = await processVoiceCommand(transcript, design);

            if (aiResponse.updates && Object.keys(aiResponse.updates).length > 0) {
                // Remove null/undefined values
                const cleanUpdates = Object.fromEntries(
                    Object.entries(aiResponse.updates).filter(([, v]) => v != null)
                );
                setDesign(cleanUpdates, `مساعد ذكي: ${transcript}`);
            }

            setReply(aiResponse.reply);
            setIsListening(false);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (event: any) => {
            console.error("Speech Error:", event.error);
            setReply("لم أتمكن من سماعك بوضوح.");
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center z-50 w-full px-4">
            {reply && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 bg-white/95 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl text-base font-bold text-blue-900 border border-blue-100 flex items-center gap-2"
                >
                    <span className="text-2xl">🤖</span>
                    {reply}
                </motion.div>
            )}

            <button
                onClick={isListening ? stopListening : startListening}
                className={`flex items-center gap-3 px-8 py-4 rounded-full shadow-2xl transition-all duration-300 ${isListening
                    ? 'bg-red-500 scale-110 shadow-red-500/50'
                    : 'bg-slate-900 hover:bg-slate-800'
                    } text-white`}
            >
                {isListening ? (
                    <>
                        <StopCircle size={24} className="animate-pulse" />
                        <span className="font-bold">جاري الاستماع...</span>
                    </>
                ) : (
                    <>
                        <Mic size={24} />
                        <span className="font-bold text-lg">مساعد المصمم</span>
                    </>
                )}
            </button>
        </div>
    );
}

// Helper for animation
import { motion } from 'framer-motion';
