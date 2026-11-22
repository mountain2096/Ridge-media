export function mergeSavedPost(post, saved) {
  return {
    ...post,
    content: saved.content,
    image: saved.image,
    video: saved.video,
    editedAt: saved.editedAt,
    updatedAt: saved.updatedAt,
  };
}
