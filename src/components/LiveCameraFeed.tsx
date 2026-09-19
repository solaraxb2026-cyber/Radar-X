import React, { useEffect, useRef, useState } from 'react';
import { Camera, Eye, VideoOff, Maximize2, ShieldCheck, User, PawPrint } from 'lucide-react';
import { CameraDetectionTarget } from '../sensors/cameraSensor';
import { sensorRegistry } from '../sensors';

interface LiveCameraFeedProps {
  isActive: boolean;
  onToggleActive: () => void;
  detections: CameraDetectionTarget[];
}

export const LiveCameraFeed: React.FC<LiveCameraFeedProps> = ({
  isActive,
  onToggleActive,
  detections,
}) => {
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [isLiveStream, setIsLiveStream] = useState(false);

  useEffect(() => {
    const videoEl = sensorRegistry.camera.getVideoElement();
    if (videoEl && videoContainerRef.current) {
      videoEl.className = 'w-full h-full object-cover rounded-xl';
      videoContainerRef.current.innerHTML = '';
      videoContainerRef.current.appendChild(videoEl);
      setIsLiveStream(true);
    } else {
      setIsLiveStream(false);
    }
  }, [isActive]);

  const primaryDetection = detections.length > 0 ? detections[0] : null;

  return (
    <div className="relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden font-sans shadow-xl">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <Camera className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
          <span className="font-semibold text-slate-200">
            {isLiveStream ? 'Hardware Optical Sensor (CameraX / RGB)' : 'On-Device Vision Analyzer (68° Optical FOV)'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
            8 FPS • INT8 Quantized
          </span>
          <button
            type="button"
            onClick={onToggleActive}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              isActive 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {isActive ? 'Active' : 'Standby'}
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
        {isActive ? (
          <>
            {/* Live Video Mount or Synthetic Optical Stage */}
            <div ref={videoContainerRef} className="absolute inset-0 z-0 opacity-70" />

            {/* Synthetic Canvas Grid Background if no physical webcam attached */}
            {!isLiveStream && (
              <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
            )}

            {/* Optical FOV Azimuth Guidelines */}
            <div className="absolute inset-x-0 bottom-2 flex justify-between px-4 text-[10px] font-mono text-slate-500 pointer-events-none z-10">
              <span>-34° (Left Edge)</span>
              <span className="text-emerald-400 font-semibold">0° (Optical Centerline)</span>
              <span>+34° (Right Edge)</span>
            </div>

            {/* Render Bounding Boxes & Target Tracking Overlays */}
            {detections.map((det) => {
              const isHuman = det.classification === 'human';
              const strokeColor = isHuman ? 'border-emerald-400 text-emerald-400' : 'border-amber-400 text-amber-400';
              const bgColor = isHuman ? 'bg-emerald-500/10' : 'bg-amber-500/10';

              return (
                <div
                  key={det.id}
                  className={`absolute z-20 border-2 rounded-lg transition-all duration-200 ${strokeColor} ${bgColor}`}
                  style={{
                    left: `${Math.max(5, Math.min(85, det.bbox.x * 100))}%`,
                    top: `${Math.max(5, Math.min(80, det.bbox.y * 100))}%`,
                    width: `${Math.max(15, det.bbox.width * 100)}%`,
                    height: `${Math.max(25, det.bbox.height * 100)}%`,
                  }}
                >
                  {/* Bounding Box Header Tag */}
                  <div className={`absolute -top-7 left-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap bg-slate-950/95 border ${strokeColor} shadow-md flex items-center gap-1.5`}>
                    {isHuman ? <User className="w-3 h-3" /> : <PawPrint className="w-3 h-3" />}
                    <span>{det.subClass}</span>
                    <span className="text-white opacity-80">({Math.round(det.confidence * 100)}%)</span>
                  </div>

                  {/* Range & Bearing Tag */}
                  <div className="absolute -bottom-6 left-0 px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-950/90 text-slate-300 whitespace-nowrap border border-slate-800">
                    dist: {det.estimatedDistanceM.toFixed(1)}m • az: {det.bearingDeg >= 0 ? `+${det.bearingDeg}°` : `${det.bearingDeg}°`}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
            <VideoOff className="w-6 h-6 text-slate-600" />
            <span>Camera ML module throttled to preserve power budget.</span>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>MobileNet-SSD On-Device Deciding Vote</span>
        </div>
        <div className="font-mono text-[10px] text-slate-500">
          TFLite NNAPI/GPU Delegate
        </div>
      </div>
    </div>
  );
};
