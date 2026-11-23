import { createElement as h } from "react";

export function MessageActionMenu({ isMine, onRecall, onDelete, menuRef, style }) {
  return h("div", { ref: menuRef, style, className: "ridge-msg-menu", role: "menu" },
    ...(isMine ? [h("button", { key: "recall", type: "button", role: "menuitem", onClick: onRecall }, "Thu hồi")] : []),
    h("button", { key: "delete", type: "button", role: "menuitem", onClick: onDelete }, "Xóa ở phía tôi"),
  );
}
