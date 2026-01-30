
import React, { useRef, useEffect, useState } from 'react';
import { X, Camera, RefreshCw, Zap, ZapOff } from 'lucide-react';

interface Props {
  onCapture: (base64: string) => void;
  onClose: () => void;
  title: string;
}

const CameraScanner: React.FC<Props> = ({ onCapture, onClose, title }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    // Sequential fallback constraints to handle different hardware configurations
    const constraintsList = [
      // High-res back camera
      {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      },
      // Any back camera
      {
        video: { facingMode: 'environment' }
      },
      // Fallback to user camera if environment is not found
      {
        video: { facingMode: 'user' }
      },
      // Absolute fallback for any available video device
      {
        video: true
      }
    ];

    let successfulStream: MediaStream | null = null;
    let lastError: any = null;

    for (const constraints of constraintsList) {
      try {
        successfulStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (successfulStream) break;
      } catch (err) {
        lastError = err;
        console.warn('Camera constraint failed, trying fallback...', constraints, err);
      }
    }

    if (successfulStream) {
      setStream(successfulStream);
      if (videoRef.current) {
        videoRef.current.srcObject = successfulStream;
      }
      setError(null);
    } else {
      const errorMsg = lastError?.name === 'NotFoundError' || lastError?.name === 'DevicesNotFoundError'
        ? "No camera device was found on this system."
        : "Camera access was denied. Please check your browser permissions.";
      setError(errorMsg);
      console.error("All camera initialization attempts failed:", lastError);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        onCapture(base64);
        stopCamera();
      }
    }
  };

  const toggleFlash = async () => {
    if (stream) {
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      if (capabilities.torch) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: !isFlashOn }]
          } as any);
          setIsFlashOn(!isFlashOn);
        } catch (e) {
          console.error("Flash not supported", e);
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center animate-in fade-in duration-300">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={onClose} className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all">
          <X size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-white font-black text-sm uppercase tracking-[0.3em]">{title}</h2>
          <p className="text-white/50 text-[10px] font-bold uppercase mt-1">Align document within frame</p>
        </div>
        <button onClick={toggleFlash} className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all">
          {isFlashOn ? <Zap size={24} className="text-amber-400" /> : <ZapOff size={24} />}
        </button>
      </div>

      {/* Camera Viewport */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="p-10 text-center space-y-4">
             <div className="bg-red-500/10 p-6 rounded-full inline-block text-red-500">
               <Camera size={48} />
             </div>
             <p className="text-white font-black max-w-xs">{error}</p>
             <button onClick={onClose} className="bg-white text-black px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest">Go Back</button>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
            {/* Guide Frame */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
              <div className="w-full max-w-md aspect-[3/4] border-2 border-white/30 rounded-[2rem] relative shadow-[0_0_0_2000px_rgba(0,0,0,0.5)]">
                {/* Corners */}
                <div className="absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-blue-500 rounded-tl-[2rem]"></div>
                <div className="absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-blue-500 rounded-tr-[2rem]"></div>
                <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-blue-500 rounded-bl-[2rem]"></div>
                <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-blue-500 rounded-br-[2rem]"></div>
                
                {/* Scanning line effect */}
                <div className="absolute top-0 left-4 right-4 h-[2px] bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[scan_3s_linear_infinite]"></div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer / Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-12 flex justify-center items-center z-10 bg-gradient-to-t from-black/80 to-transparent">
        <canvas ref={canvasRef} className="hidden" />
        <button 
          onClick={capturePhoto}
          disabled={!!error}
          className="group relative flex items-center justify-center"
        >
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md group-active:scale-95 transition-transform">
             <div className="w-16 h-16 bg-white rounded-full border-4 border-slate-900 shadow-xl shadow-black/20"></div>
          </div>
          <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
             <span className="text-white text-[10px] font-black uppercase tracking-widest bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">Capture Scan</span>
          </div>
        </button>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
      `}</style>
    </div>
  );
};

export default CameraScanner;
