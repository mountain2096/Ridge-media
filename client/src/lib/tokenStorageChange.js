export function getTokenStorageAction(event, hasDraft) {
  if (event.key !== "token" || event.oldValue === event.newValue) return "ignore";
  if (event.newValue === null) return "logout";
  return hasDraft ? "notice" : "reload";
}
