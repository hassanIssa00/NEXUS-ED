'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, Square, Play, Pause, Trash2, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadFile } from '@/lib/api/files';

interface VoiceRecorderProps {
  onRecordingComplete?: (url: string) => void;
  onUploadStart?: () => void;
  className?: string;
  maxDuration?: number; // seconds
}

export function VoiceRecorder({
  onRecordingComplete,
  onUploadStart,
  className,
  maxDuration = 120, // 2 minutes default
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      // Setup Visualizer
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        setAudioUrl(url);
        setIsRecording(false);
        stopVisualizer();
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      };

      mediaRecorder.start(100); // Collect 100ms chunks
      setIsRecording(true);
      startTimer();
      drawVisualizer();

    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('لا يمكن الوصول للميكروفون. يرجى التحقق من الإعدادات.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      if (mediaRecorderRef.current?.state !== 'recording') return;
      
      animationRef.current = requestAnimationFrame(draw);
      analyserRef.current!.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] ?? 0) / 2;
        ctx.fillStyle = `rgb(59, 130, 246)`; // Blue-500
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();
  };

  const stopVisualizer = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };

  const startTimer = () => {
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration((prev) => {
        if (prev >= maxDuration) {
          stopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (!audioPlayerRef.current || !audioUrl) return;

    if (isPlaying) {
      audioPlayerRef.current.pause();
    } else {
      audioPlayerRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setAudioBlob(null);
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    setAudioUrl(null);
    setDuration(0);
    setIsPlaying(false);
    setPlaybackProgress(0);
  };

  const handleUpload = async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    setUploadProgress(0);
    onUploadStart?.();

    try {
      const file = new File([audioBlob], `voice-comment-${Date.now()}.webm`, { type: 'audio/webm' });
      const uploadedFile = await uploadFile(file, (progress) => {
        setUploadProgress(progress);
      });

      if (onRecordingComplete) {
        onRecordingComplete(uploadedFile.url);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('فشل رفع الملف الصوتي');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={cn("w-full max-w-sm", className)}>
      <Card className="p-4 bg-white dark:bg-gray-800 border shadow-sm">
        {/* Visualizer / Waveform Area */}
        <div className="h-16 bg-gray-50 dark:bg-gray-900 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
          {isRecording ? (
            <canvas ref={canvasRef} width={300} height={60} className="w-full h-full" />
          ) : audioUrl ? (
            <div className="flex items-center gap-2 w-full px-4">
                <audio
                ref={audioPlayerRef}
                src={audioUrl}
                onTimeUpdate={(event) => {
                  const player = event.currentTarget;
                  setPlaybackProgress(player.duration > 0 ? player.currentTime / player.duration : 0);
                }}
                onEnded={() => { setIsPlaying(false); setPlaybackProgress(1); }}
                className="hidden"
              />
              <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" role="progressbar" aria-label="موضع تشغيل التسجيل" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(playbackProgress * 100)}>
                <div className="h-full bg-blue-500 rounded-full transition-[width]" style={{ width: `${playbackProgress * 100}%` }} />
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400">جاهز للتسجيل</div>
          )}
          
          {/* Duration Overlay */}
          <div className="absolute top-1 right-2 text-xs font-mono bg-black/50 text-white px-1.5 py-0.5 rounded">
            {formatTime(duration)}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {!audioUrl ? (
            // Recording State
            <Button
              variant={isRecording ? "destructive" : "default"}
              size="icon"
              className={cn("w-12 h-12 rounded-full shadow-lg transition-all", isRecording && "scale-110")}
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? (
                <Square className="w-5 h-5 fill-current" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </Button>
          ) : (
            // Review State
            <>
              <Button
                variant="outline"
                size="icon"
                className="w-10 h-10 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={handleReset}
                disabled={isUploading}
              >
                <Trash2 className="w-4 h-4" />
              </Button>

              <Button
                variant="default"
                size="icon"
                className="w-12 h-12 rounded-full shadow-md"
                onClick={handlePlayPause}
                disabled={isUploading}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </Button>

              <Button
                variant="default"
                size="icon"
                className="w-10 h-10 rounded-full bg-green-600 hover:bg-green-700 text-white"
                onClick={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </>
          )}
        </div>
        
        {isUploading && (
           <div className="mt-2 text-center text-xs text-gray-500">
             جاري الرفع... {uploadProgress}%
           </div>
        )}
      </Card>
    </div>
  );
}
