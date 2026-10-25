const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function uploadMedia(file) {
  const formData = new FormData();
  formData.append("file", file);

  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Không thể tải tệp lên.");
  }

  return data;
}
