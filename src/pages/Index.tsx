import React, { useState, useRef } from 'react';
import { Mic, Square, Upload } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        await handleAudioUpload(audioBlob);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      toast({
        title: "Recording started",
        description: "Speak clearly into your microphone"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleAudioUpload(file);
    }
  };

  const handleAudioUpload = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setTranscription("");

    const formData = new FormData();
    formData.append('audio', audioBlob);

    try {
      const response = await fetch('http://localhost:5000/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive"
        });
      } else {
        setTranscription(data.transcription);
        toast({
          title: "Success",
          description: "Audio transcribed successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to transcribe audio",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <Card className="p-8">
          <h1 className="text-3xl font-bold text-purple-900 mb-6">Audio Transcription</h1>
          
          <div className="flex gap-4 justify-center mb-8">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              variant={isRecording ? "destructive" : "default"}
              className="w-40"
              disabled={isProcessing}
            >
              {isRecording ? (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Start Recording
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="w-40"
              onClick={() => document.getElementById('fileInput')?.click()}
              disabled={isProcessing || isRecording}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Audio
            </Button>
            <input
              type="file"
              id="fileInput"
              accept="audio/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {isProcessing && (
            <div className="text-center text-purple-600 animate-pulse mb-4">
              Processing audio...
            </div>
          )}

          {transcription && (
            <Card className="p-6 bg-white shadow-sm">
              <h2 className="text-lg font-semibold text-purple-900 mb-3">Transcription</h2>
              <p className="text-gray-700 leading-relaxed">{transcription}</p>
            </Card>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Index;