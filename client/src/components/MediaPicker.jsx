import { useEffect, useRef } from "react";
import { resolveMediaUrl } from "../lib/api.js";

function MediaPicker({ label, kind, file, previewUrl, currentUrl, onFileChange, onRemove }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!file && inputRef.current) inputRef.current.value = "";
  }, [file]);

  const preview = previewUrl || currentUrl;
  const isAvatar = kind === "avatar";

  return (
    <div className="settings-image-field media-picker">
      <span className="settings-label">{label}</span>
      <div className="media-picker-actions">
        <label className="settings-file-button">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-9 9" /></svg>
          Chọn ảnh
          <input
            ref={inputRef}
            className="settings-file-input"
            type="file"
            accept="image/*"
            aria-label={`Chọn ${label.toLocaleLowerCase("vi")}`}
            onChange={(event) => onFileChange(event.target.files?.[0] || null)}
          />
        </label>
        {file && <button className="settings-file-button media-picker-remove" type="button" onClick={() => { if (inputRef.current) inputRef.current.value = ""; onRemove(); }}>Gỡ</button>}
      </div>
      <span className="settings-file-name" title={file?.name || undefined}>
        {file?.name || (currentUrl ? "Ảnh hiện tại" : "Chưa chọn ảnh")}
      </span>
      {preview && <img className={isAvatar ? "settings-avatar-preview" : "settings-cover-preview"} src={resolveMediaUrl(preview)} alt={`Xem trước ${label.toLocaleLowerCase("vi")}`} />}
    </div>
  );
}

export default MediaPicker;
