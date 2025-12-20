"use client";

import { useEffect, useState, useCallback } from "react";

export const useVoiceCommands = (commands: Record<string, () => void>) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech Recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const text = event.results[last][0].transcript.toLowerCase();
      setTranscript(text);
      
      Object.keys(commands).forEach(command => {
        if (text.includes(command.toLowerCase())) {
          commands[command]();
        }
      });
    };

    recognition.start();
  }, [commands]);

  return { isListening, transcript, startListening };
};
