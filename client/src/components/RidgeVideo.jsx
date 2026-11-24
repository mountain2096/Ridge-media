import { useEffect, useRef, useState } from "react";
import { resolveMediaUrl } from "../lib/api.js";

let activeVideo;

export default function RidgeVideo({ src, className = "", onExpand, preload = "metadata" }) {
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState(false);
  const [touch, setTouch] = useState(false);
  const format = (value) => `${Math.floor((Number.isFinite(value) ? value : 0) / 60)}:${String(Math.floor(Number.isFinite(value) ? value : 0) % 60).padStart(2, "0")}`;
  const showTemporarily = () => {
    setHidden(false);
    clearTimeout(timerRef.current);
    if (playing && touch) timerRef.current = window.setTimeout(() => setHidden(true), 2000);
  };
  const togglePlay = () => {
    const video = videoRef.current;
    if (video.paused) video.play().catch(() => setError(true));
    else video.pause();
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return <div className={`ridge-video ${playing && hidden ? "is-hidden" : ""}`} onPointerDown={(event) => { if (event.pointerType === "touch") { setTouch(true); showTemporarily(); } }} onMouseLeave={() => { if (playing) { clearTimeout(timerRef.current); timerRef.current = window.setTimeout(() => setHidden(true), 2000); } }} onMouseEnter={() => setHidden(false)} onFocus={() => setHidden(false)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget) && playing) setHidden(true); }}>
    <video ref={videoRef} className={className} src={resolveMediaUrl(src)} preload={preload} disablePictureInPicture playsInline controlsList="nodownload nofullscreen noremoteplayback" onClick={togglePlay} onPlay={() => { if (activeVideo && activeVideo !== videoRef.current) activeVideo.pause(); activeVideo = videoRef.current; setPlaying(true); setError(false); setHidden(false); if (touch) { clearTimeout(timerRef.current); timerRef.current = window.setTimeout(() => setHidden(true), 2000); } }} onPause={() => { setPlaying(false); setHidden(false); clearTimeout(timerRef.current); }} onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)} onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)} onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)} onError={() => setError(true)} />
    {!playing && <button className="ridge-video-center" type="button" aria-label="Phát" onClick={togglePlay}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 12 7-12 7z" /></svg></button>}
    {error && <span className="ridge-video-error">Không phát được video</span>}
    <div className="ridge-video-bar">
      <button type="button" aria-label={playing ? "Tạm dừng" : "Phát"} onClick={togglePlay}><svg viewBox="0 0 24 24" aria-hidden="true">{playing ? <path d="M8 5h3v14H8zm5 0h3v14h-3z" /> : <path d="m8 5 12 7-12 7z" />}</svg></button>
      <span className="ridge-video-time">{format(time)} / {format(duration)}</span>
      <input aria-label="Tiến trình video" type="range" min="0" max={duration || 0} step="0.1" value={Math.min(time, duration || 0)} style={{ "--ridge-progress": `${duration ? time / duration * 100 : 0}%` }} onChange={(event) => { const value = Number(event.target.value); videoRef.current.currentTime = value; setTime(value); showTemporarily(); }} />
      <button type="button" aria-label={muted ? "Bật tiếng" : "Tắt tiếng"} onClick={() => { videoRef.current.muted = !muted; setMuted(!muted); }}><svg viewBox="0 0 24 24" aria-hidden="true">{muted ? <><path d="M4 9v6h4l5 4V5L8 9zM17 9l5 6m0-6-5 6" /></> : <><path d="M4 9v6h4l5 4V5L8 9zM17 9a5 5 0 0 1 0 6m2-9a9 9 0 0 1 0 12" /></>}</svg></button>
      {onExpand && <button type="button" aria-label="Mở trong Reels" onClick={onExpand}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4H4v4m0-4 6 6m6-6h4v4m0-4-6 6M4 16v4h4m-4 0 6-6m10 2v4h-4m4 0-6-6" /></svg></button>}
    </div>
    <span className="ridge-video-progress" style={{ width: `${duration ? time / duration * 100 : 0}%` }} />
  </div>;
}
