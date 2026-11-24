export function postBackTarget(state) {
  return state?.from === "/admin" && state?.tab === "moderation"
    ? { to: "/admin?tab=moderation", label: "← Kiểm duyệt" }
    : { to: "/feed", label: "← Bảng tin" };
}
