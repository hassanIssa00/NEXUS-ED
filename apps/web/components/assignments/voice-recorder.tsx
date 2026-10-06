'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Play, Trash2, Volume2 } from 'lucide-react';
import { uploadFile } from '@/lib/api/files';

interface VoiceRecorderProps {
  onAudioUpload: (url: string) => void;
  isUploading?: boolean;
}

export function VoiceRecorder({ onAudioUpload, isUploading }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        
        // Auto upload? or manual?
        // For now, let's keep it manual or auto-upload after stop
        await uploadAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone', err);
      alert('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop all tracks to release microphone
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const uploadAudio = async (blob: Blob) => {
    try {
      const extension = blob.type.includes('wav') ? 'wav' : 'webm';
      const uploaded = await uploadFile(new File([blob], `feedback.${extension}`, { type: blob.type }));
      onAudioUpload(uploaded.url);
    } catch (error) {
      console.error('Upload failed', error);
    }
  };

  const discardRecording = () => {
    setAudioURL(null);
  };

  return (
    <div className="flex flex-col gap-2 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium flex items-center gap-2">
          <Volume2 className="w-4 h-4" />
          ملاحظة صوتية
        </span>
        {isRecording && (
          <span className="flex items-center gap-1 text-red-500 animate-pulse text-xs">
            <span className="w-2 h-2 bg-red-500 rounded-full" />
            جاري التسجيل...
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {!isRecording && !audioURL && (
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={startRecording}
            className="flex-1 gap-2"
          >
            <Mic className="w-4 h-4 text-red-500" />
            بدء التسجيل
          </Button>
        )}

        {isRecording && (
          <Button 
            type="button" 
            variant="destructive" 
            size="sm" 
            onClick={stopRecording}
            className="flex-1 gap-2"
          >
            <Square className="w-4 h-4" />
            إيقاف
          </Button>
        )}

        {audioURL && !isRecording && (
          <>
            <audio src={audioURL} controls className="h-8 flex-1" />
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              onClick={discardRecording}
              className="text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
      
      {isUploading && (
        <div className="text-[10px] text-blue-500">جاري الرفع...</div>
      )}
    </div>
  );
}
