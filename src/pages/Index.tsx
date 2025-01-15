import React, { useState, useRef } from 'react';
import { Mic, Square, Upload, Download } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import lamejs from 'lamejs';

const Index = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
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
        setRecordedAudio(audioBlob);
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

  const downloadRecording = async () => {
    if (!recordedAudio) return;

    const audioContext = new AudioContext();
    const audioData = await recordedAudio.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(audioData);
    
    // Convert to MP3
    const mp3Encoder = new lamejs.Mp3Encoder(1, audioBuffer.sampleRate, 128);
    const samples = new Int16Array(audioBuffer.length);
    const channel = audioBuffer.getChannelData(0);
    
    // Convert Float32 to Int16
    for (let i = 0; i < channel.length; i++) {
      samples[i] = channel[i] < 0 ? channel[i] * 0x8000 : channel[i] * 0x7FFF;
    }
    
    const mp3Data = mp3Encoder.encodeBuffer(samples);
    const mp3Final = mp3Encoder.flush();
    
    // Combine the encoded data
    const mp3Blob = new Blob([mp3Data, mp3Final], { type: 'audio/mp3' });
    
    // Create download link
    const url = URL.createObjectURL(mp3Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recording.mp3';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Recording downloaded as MP3"
    });
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

            {recordedAudio && (
              <Button
                variant="outline"
                className="w-40"
                onClick={downloadRecording}
                disabled={isProcessing || isRecording}
              >
                <Download className="w-4 h-4 mr-2" />
                Download MP3
              </Button>
            )}

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