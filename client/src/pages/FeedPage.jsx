import { Link, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import MessagesView from "../components/MessagesView.jsx";
import ProfileSettings from "../components/ProfileSettings.jsx";
import AdminPanel from "../components/AdminPanel.jsx";
import { uploadMedia } from "../lib/uploadMedia.js";
import { API_BASE } from "../lib/api.js";
import { useConfirm } from "../components/ConfirmDialog.jsx";
import ReportDialog from "../components/ReportDialog.jsx";
import Toast from "../components/Toast.jsx";
import "../newsfeed.css";
function FeedPage({ section = "feed" }){
    const confirmAction = useConfirm();
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser, setCurrentUser, searchQuery } = useOutletContext();
    const activeSection = section;
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [postContent, setPostContent] = useState("");
    const [postPrivacy, setPostPrivacy] = useState("public");
    const [feedPage, setFeedPage] = useState(1);
    const [hasMorePosts, setHasMorePosts] = useState(false);
    const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
    const [isPosting, setIsPosting] = useState(false);
    const [postError, setPostError] = useState("");
    const [reloadPosts, setReloadPosts] = useState(0);
    const [likedPostIds, setLikedPostIds] = useState([]);
    const [likeError, setLikeError] = useState("");
    const [openCommentsFor, setOpenCommentsFor] = useState(null);
    const [comments, setComments] = useState([]);
    const commentsRequestId = useRef(0);
    const handledPostHash = useRef("");
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [commentError, setCommentError] = useState("");
    const [commentContent, setCommentContent] = useState("");
    const [isSendingComment, setIsSendingComment] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingCommentContent, setEditingCommentContent] = useState("");
    const [isUpdatingComment, setIsUpdatingComment] = useState(false);
    const [postImageFile, setPostImageFile] = useState(null);
    const [postVideoFile, setPostVideoFile] = useState(null);
    const [openPostMenuId, setOpenPostMenuId] = useState(null);
    const [editingPostId, setEditingPostId] = useState(null);
    const [editingPostContent, setEditingPostContent] = useState("");
    const [postActionError, setPostActionError] = useState("");
    const [isSavingPost, setIsSavingPost] = useState(false);
    const [people, setPeople] = useState([]);
    const [isLoadingPeople, setIsLoadingPeople] = useState(false);
    const [peopleError, setPeopleError] = useState("");
    const [sentRequestIds, setSentRequestIds] = useState([]);
    const [sendingFriendRequestIds, setSendingFriendRequestIds] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [isLoadingFriendRequests, setIsLoadingFriendRequests] = useState(false);
    const [friendRequestError, setFriendRequestError] = useState("");
    const [friends, setFriends] = useState([]);
    const [shareFeedback, setShareFeedback] = useState("");
    const [reportTarget, setReportTarget] = useState(null);
    const [failedImagePostIds, setFailedImagePostIds] = useState([]);
    const [stories, setStories] = useState([]);
    const [storyReloadKey, setStoryReloadKey] = useState(0);
    const [isStoryComposerOpen, setIsStoryComposerOpen] = useState(false);
    const [storyFile, setStoryFile] = useState(null);
    const [isPostingStory, setIsPostingStory] = useState(false);
    const [storyFeedback, setStoryFeedback] = useState("");
    const [activeStoryGroup, setActiveStoryGroup] = useState(null);
    const [activeStoryIndex, setActiveStoryIndex] = useState(0);

    useEffect(() => {
      if (activeSection !== "connections") return undefined;
      const controller = new AbortController();
      async function loadFriendRequests() {
        setIsLoadingFriendRequests(true);
        setFriendRequestError("");
        try {
          const token = localStorage.getItem("token");
          const response = await fetch(`${API_BASE}/api/friend/requests`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || "Không thể tải lời mời kết bạn.");
          }
          setFriendRequests(data.request);
        } catch (requestError) {
          if (requestError.name !== "AbortError") {
            setFriendRequestError(requestError.message);
          }
        } finally {
          if (!controller.signal.aborted) setIsLoadingFriendRequests(false);
        }
      }

      loadFriendRequests();
      return () => controller.abort();
    }, [activeSection]);

    useEffect(() => {
      const controller = new AbortController();
      async function loadStories() {
        try {
          const token = localStorage.getItem("token");
          const response = await fetch(`${API_BASE}/api/story`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || "Không thể tải story.");
          }
          setStories(data.stories);
        } catch (requestError) {
          if (requestError.name !== "AbortError") {
            setStoryFeedback(requestError.message);
          }
        }
      }

      loadStories();
      return () => controller.abort();
    }, [storyReloadKey]);

    useEffect(() => {
      async function loadFriends() {
        try {
          const token = localStorage.getItem("token");
          const response = await fetch(`${API_BASE}/api/friend`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          if (response.ok) {
            setFriends(data.friend);
          }
        } catch {
          // Friend suggestions and feed remain usable if this optional list fails.
        }
      }

      loadFriends();
    }, []);

    useEffect(() => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(async () => {
        setIsLoadingPeople(true);
        setPeopleError("");
        try {
          const token = localStorage.getItem("token");
          const response = await fetch(
            `${API_BASE}/api/user/search?q=${encodeURIComponent(searchQuery)}`,
            {
              headers: { Authorization: `Bearer ${token}` },
              signal: controller.signal,
            }
          );
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || "Không thể tìm người dùng.");
          }
          setPeople(data.users);
          setSentRequestIds(data.users
            .filter((person) => person.hasPendingRequest)
            .map((person) => person._id));
        } catch (requestError) {
          if (requestError.name !== "AbortError") {
            setPeopleError(requestError.message);
          }
        } finally {
          if (!controller.signal.aborted) {
            setIsLoadingPeople(false);
          }
        }
      }, 250);

      return () => {
        window.clearTimeout(timeoutId);
        controller.abort();
      };
    }, [searchQuery]);

    useEffect(() => {
        async function loadPosts() {
        setError("");
        try {
            const token = localStorage.getItem("token");

            const response = await fetch(`${API_BASE}/api/post?page=${feedPage}&limit=20`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            });

            const data = await response.json();

            if (!response.ok) {
            throw new Error(data.message || "Không thể tải bài viết.");
            }

            if (!Array.isArray(data.posts)) {
              throw new Error("Dữ liệu bài viết từ máy chủ không hợp lệ.");
            }
            setPosts((currentPosts) => feedPage === 1 ? data.posts : [...currentPosts, ...data.posts]);
            setHasMorePosts(data.pagination ? feedPage < data.pagination.pages : false);
            setLikedPostIds(
              data.posts
                .filter((post) => post.isLiked)
                .map((post) => post._id)
            );
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
            setIsLoadingMorePosts(false);
        }
        }

        loadPosts();
    }, [reloadPosts, feedPage]);

    useEffect(() => {
      if (isLoading || !location.hash || handledPostHash.current === location.hash) {
        return;
      }

      const target = document.getElementById(location.hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        handledPostHash.current = location.hash;
      }
    }, [isLoading, location.hash, posts]);

    async function handleCreatePost(event) {
      event.preventDefault();
      const form = event.currentTarget;

      const content = postContent.trim();

      if (!content) {
        setPostError("Bạn hãy nhập nội dung bài viết.");
        return;
      }

      setIsPosting(true);
      setPostError("");

      try {
        const [uploadedImage, uploadedVideo] = await Promise.all([
          postImageFile ? uploadMedia(postImageFile) : null,
          postVideoFile ? uploadMedia(postVideoFile) : null,
        ]);
        const token = localStorage.getItem("token");

        const response = await fetch(`${API_BASE}/api/post`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content,
            image: uploadedImage?.url || "",
            video: uploadedVideo?.url || "",
            privacy: postPrivacy,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Không thể đăng bài.");
        }

        setPostContent("");
        setPostImageFile(null);
        setPostVideoFile(null);
        setPostPrivacy("public");
        form.reset();
        if (feedPage !== 1) setFeedPage(1);
        else setReloadPosts((currentValue) => currentValue + 1);
      } catch (requestError) {
        setPostError(requestError.message);
      } finally {
        setIsPosting(false);
      }
    }
    async function handleDeletePost(postId) {
      if (!(await confirmAction({
        title: "Xóa bài viết",
        message: "Bạn có chắc muốn xóa bài viết này?",
        confirmLabel: "Xóa bài viết",
        danger: true,
      }))) {
        return;
      }

      setPostActionError("");

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE}/api/post/${postId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Không thể xóa bài viết.");
        }

        setPosts((currentPosts) => currentPosts.filter((post) => post._id !== postId));
        setOpenPostMenuId(null);
        if (openCommentsFor === postId) {
          setOpenCommentsFor(null);
          setComments([]);
        }
      } catch (requestError) {
        setPostActionError(requestError.message);
      }
    }
    async function handleUpdatePost(event, postId) {
      event.preventDefault();
      const content = editingPostContent.trim();

      if (!content) {
        setPostActionError("Nội dung bài viết không được để trống.");
        return;
      }

      setIsSavingPost(true);
      setPostActionError("");

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE}/api/post/${postId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Không thể cập nhật bài viết.");
        }

        setPosts((currentPosts) => currentPosts.map((post) =>
          post._id === postId ? { ...post, content: data.post.content } : post
        ));
        setEditingPostId(null);
        setEditingPostContent("");
      } catch (requestError) {
        setPostActionError(requestError.message);
      } finally {
        setIsSavingPost(false);
      }
    }
    async function handleToggleSavedPost(postId, isSaved) {
      setPostActionError("");
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE}/api/post/${postId}/save`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ isSaved: !isSaved }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Không thể cập nhật bài viết đã lưu.");
        }
        setPosts((currentPosts) => currentPosts.map((post) =>
          post._id === postId ? { ...post, isSaved: data.isSaved } : post
        ));
      } catch (requestError) {
        setPostActionError(requestError.message);
      }
    }
    async function handleSharePost(postId) {
      try {
        const response = await fetch(`${API_BASE}/api/post/${postId}/share`, {
          method: "POST",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Không thể chia sẻ bài viết.");
        setShareFeedback(data.message);
        setFeedPage(1);
        setReloadPosts((currentValue) => currentValue + 1);
      } catch (requestError) {
        setPostActionError(requestError.message);
      }
    }

    function handleReport(targetType, targetId) {
      setReportTarget({ targetType, targetId });
    }

    async function submitReport({ reason, description }) {
      const response = await fetch(`${API_BASE}/api/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({
          targetType: reportTarget.targetType,
          targetId: reportTarget.targetId,
          reason,
          description,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể gửi báo cáo.");
      setShareFeedback(data.message);
    }

    function handleLoadMorePosts() {
      setIsLoadingMorePosts(true);
      setFeedPage((currentPage) => currentPage + 1);
    }
    async function handleSendFriendRequest(userId) {
      if (sentRequestIds.includes(userId) || sendingFriendRequestIds.includes(userId)) return;
      setPeopleError("");
      setSendingFriendRequestIds((currentIds) => [...currentIds, userId]);
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${API_BASE}/api/friend/request/${userId}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Không thể gửi lời mời kết bạn.");
        }
        setSentRequestIds((currentIds) => [...currentIds, userId]);
      } catch (requestError) {
        setPeopleError(requestError.message);
      } finally {
        setSendingFriendRequestIds((currentIds) => currentIds.filter((id) => id !== userId));
      }
    }
    async function handleBlockUser(userId) {
      if (!(await confirmAction({
        title: "Chặn người dùng",
        message: "Bạn có chắc muốn chặn người dùng này?",
        confirmLabel: "Chặn người dùng",
        danger: true,
      }))) return;
      setPeopleError("");
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE}/api/user/block/${userId}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Không thể chặn người dùng.");
        }
        setPeople((currentPeople) => currentPeople.filter((person) => person._id !== userId));
        setFriends((currentFriends) => currentFriends.filter((friend) => friend._id !== userId));
        setFriendRequests((currentRequests) => currentRequests.filter(
          (request) => request.senderId?._id !== userId
        ));
      } catch (requestError) {
        setPeopleError(requestError.message);
      }
    }
    async function handleFriendRequestAction(requestId, action) {
      setPeopleError("");
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${API_BASE}/api/friend/request/${requestId}/${action}`,
          {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Không thể xử lý lời mời kết bạn.");
        }
        if (action === "accept") {
          const acceptedRequest = friendRequests.find((request) => request._id === requestId);
          if (acceptedRequest?.senderId) {
            setFriends((currentFriends) => currentFriends.some(
              (friend) => friend._id === acceptedRequest.senderId._id
            ) ? currentFriends : [...currentFriends, acceptedRequest.senderId]);
          }
        }
        setFriendRequests((currentRequests) => currentRequests.filter(
          (request) => request._id !== requestId
        ));
      } catch (requestError) {
        setPeopleError(requestError.message);
      }
    }
    async function handleStartConversation(userId) {
      setPeopleError("");
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${API_BASE}/api/message/conversation/${userId}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Không thể mở cuộc trò chuyện.");
        }
        navigate("/messages", { state: { openConversationId: data.conversation._id } });
      } catch (requestError) {
        setPeopleError(requestError.message);
      }
    }
    async function handleUnfriend(userId) {
      setPeopleError("");
      try {
        const response = await fetch(`${API_BASE}/api/friend/${userId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Không thể hủy kết bạn.");
        setFriends((currentFriends) => currentFriends.filter((friend) => friend._id !== userId));
      } catch (requestError) {
        setPeopleError(requestError.message);
      }
    }
    async function handleCreateStory(event) {
      event.preventDefault();
      const form = event.currentTarget;
      setStoryFeedback("");
      setIsPostingStory(true);
      try {
        if (!storyFile) {
          throw new Error("Hãy chọn ảnh hoặc video để đăng story.");
        }
        const uploadedStory = await uploadMedia(storyFile);
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE}/api/story`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ mediaUrl: uploadedStory.url, mediaType: uploadedStory.mediaType }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Không thể đăng story.");
        }
        setStoryFile(null);
        form.reset();
        setIsStoryComposerOpen(false);
        setStoryReloadKey((value) => value + 1);
      } catch (requestError) {
        setStoryFeedback(requestError.message);
      } finally {
        setIsPostingStory(false);
      }
    }
    async function handleDeleteStory(storyId) {
      if (!(await confirmAction({
        title: "Xóa story",
        message: "Bạn có chắc muốn xóa story này?",
        confirmLabel: "Xóa story",
        danger: true,
      }))) return;

      setStoryFeedback("");
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE}/api/story/${storyId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Không thể xóa story.");
        }
        setActiveStoryGroup(null);
        setStoryReloadKey((value) => value + 1);
      } catch (requestError) {
        setStoryFeedback(requestError.message);
      }
    }
    async function handleLike(postId, hasLiked) {
      setLikeError("");

      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_BASE}/api/post/${postId}/like`,
          {
            method: hasLiked ? "DELETE" : "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Không thể thích bài viết.");
        }

        setPosts((currentPosts) =>
          currentPosts.map((post) =>
            post._id === postId ? { ...post, likes: data.likes } : post
          )
        );

        setLikedPostIds((currentIds) => hasLiked ? currentIds.filter((id) => id !== postId) : [...currentIds, postId]);
      } catch (requestError) {
        setLikeError(requestError.message);
      }
    }
    async function handleToggleComments(postId) {
      if (openCommentsFor === postId) {
        commentsRequestId.current += 1;
        setOpenCommentsFor(null);
        setComments([]);
        return;
      }

      const requestId = commentsRequestId.current + 1;
      commentsRequestId.current = requestId;
      setOpenCommentsFor(postId);
      setIsLoadingComments(true);
      setCommentError("");

      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_BASE}/api/comment/${postId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Không thể tải bình luận.");
        }

        if (commentsRequestId.current === requestId) {
          setComments(data.comment);
        }
      } catch (requestError) {
        if (commentsRequestId.current === requestId) {
          setCommentError(requestError.message);
        }
      } finally {
        if (commentsRequestId.current === requestId) {
          setIsLoadingComments(false);
        }
      }
    }
    async function handleCreateComment(event, postId) {
      event.preventDefault();

      const content = commentContent.trim();

      if (!content) {
        setCommentError("Bạn hãy nhập nội dung bình luận.");
        return;
      }

      setIsSendingComment(true);
      setCommentError("");

      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_BASE}/api/comment/${postId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ content }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Không thể gửi bình luận.");
        }

        setCommentContent("");

        const commentsResponse = await fetch(
          `${API_BASE}/api/comment/${postId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const commentsData = await commentsResponse.json();

        if (!commentsResponse.ok) {
          throw new Error(commentsData.message || "Không thể tải lại bình luận.");
        }

        setComments(commentsData.comment);
      } catch (requestError) {
        setCommentError(requestError.message);
      } finally {
        setIsSendingComment(false);
      }
    }
    async function handleDeleteComment(commentId) {
      const confirmed = await confirmAction({
        title: "Xóa bình luận",
        message: "Bạn có chắc muốn xóa bình luận này?",
        confirmLabel: "Xóa bình luận",
        danger: true,
      });

      if (!confirmed) {
        return;
      }

      setCommentError("");

      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_BASE}/api/comment/${commentId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Không thể xóa bình luận.");
        }

        setComments((currentComments) =>
          currentComments.filter((comment) => comment._id !== commentId)
        );
      } catch (requestError) {
        setCommentError(requestError.message);
      }
    }
    async function handleUpdateComment(event, commentId) {
      event.preventDefault();

      const content = editingCommentContent.trim();

      if (!content) {
        setCommentError("Nội dung bình luận không được để trống.");
        return;
      }

      setIsUpdatingComment(true);
      setCommentError("");

      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_BASE}/api/comment/${commentId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ content }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Không thể sửa bình luận.");
        }

        setComments((currentComments) =>
          currentComments.map((comment) =>
            comment._id === commentId
              ? { ...comment, content: data.comment.content }
              : comment
          )
        );

        setEditingCommentId(null);
        setEditingCommentContent("");
      } catch (requestError) {
        setCommentError(requestError.message);
      } finally {
        setIsUpdatingComment(false);
      }
    }
    const displayedPosts = activeSection === "saved"
      ? posts.filter((post) => post.isSaved)
      : activeSection === "activity"
        ? posts.filter((post) => post.isMine)
        : activeSection === "reels"
          ? posts.filter((post) => post.video)
          : posts;
    const storyGroups = Object.values(stories.reduce((groups, story) => {
      const authorId = story.authorId?._id;
      if (!authorId) return groups;
      if (!groups[authorId]) {
        groups[authorId] = { author: story.authorId, items: [] };
      }
      groups[authorId].items.push(story);
      return groups;
    }, {}));
    const myStoryGroup = storyGroups.find((group) => group.author._id === currentUser?._id);
    const currentStory = activeStoryGroup?.items[activeStoryIndex];

    return (
        <><section className={"feed-column " + (section === "feed" ? "" : "feed-column-single")}>
                {activeSection === "messages" ? (
                  <MessagesView currentUser={currentUser} initialConversationId={location.state?.openConversationId} />
                ) : activeSection === "settings" ? (
                  <ProfileSettings
                    key={currentUser?._id || "profile-loading"}
                    currentUser={currentUser}
                    onProfileSaved={(savedUser) => setCurrentUser((current) => ({
                      ...current,
                      ...savedUser,
                      _id: savedUser.id || current?._id,
                    }))}
                  />
                ) : activeSection === "admin" && currentUser?.isAdmin ? (
                  <AdminPanel />
                ) : activeSection === "friends" ? (
                  <section className="friends-page">
                    <h1 className="section-title">Danh sách bạn bè</h1>
                    {friends.length === 0 ? <p>Bạn chưa có bạn bè nào.</p> : (
                      <div className="friends-page-list">
                        {friends.map((friend) => (
                          <div className="friend-row" key={friend._id}>
                            <Link className="friend-avatar" to={`/profile/${friend._id}`} aria-label={`Xem trang cá nhân ${friend.username}`}>
                              {friend.profilePicture ? <img src={friend.profilePicture} alt="" /> : (friend.username?.charAt(0).toUpperCase() || "?")}
                            </Link>
                            <Link className="friend-name profile-name-link" to={`/profile/${friend._id}`}>{friend.username}</Link>
                            <button className="btn-outline" type="button" onClick={() => handleStartConversation(friend._id)}>Nhắn tin</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                ) : activeSection === "connections" ? (
                  <section className="connections-page">
                    <h1 className="section-title">Kết nối với mọi người</h1>
                    <section className="side-card">
                      <h2>Lời mời kết bạn</h2>
                      {friendRequestError && <p className="feedback-message error">{friendRequestError}</p>}
                      {isLoadingFriendRequests ? (
                        <p>Đang tải lời mời kết bạn...</p>
                      ) : friendRequests.length === 0 && !friendRequestError ? (
                        <p>Bạn chưa có lời mời kết bạn nào.</p>
                      ) : !friendRequestError && (
                        <div className="people-list">
                          {friendRequests.map((request) => (
                            <div className="friend-request-row" key={request._id}>
                              <Link className="connection-person-avatar" to={"/profile/" + request.senderId?._id} aria-label={`Xem trang cá nhân ${request.senderId?.username || "người dùng"}`}>
                                {request.senderId?.profilePicture ? <img src={request.senderId.profilePicture} alt="" /> : (request.senderId?.username?.charAt(0).toUpperCase() || "?")}
                              </Link>
                              <Link className="connection-person-name profile-name-link" to={"/profile/" + request.senderId?._id}>{request.senderId?.username || "Người dùng"}</Link>
                              <div>
                                <button type="button" onClick={() => handleFriendRequestAction(request._id, "accept")}>Chấp nhận</button>
                                <button
                                  type="button"
                                  className="reject-request"
                                  onClick={() => handleFriendRequestAction(request._id, "reject")}
                                >Từ chối</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                    <section className="side-card connections-friends-card">
                      <h2>Bạn bè của bạn</h2>
                      {friends.length === 0 ? <p className="friends-empty">Chưa có bạn bè.</p> : (
                        <div className="connections-friends-list">
                          {friends.map((friend) => (
                            <div className="connection-friend-row" key={friend._id}>
                              <Link className="connection-person-avatar" to={"/profile/" + friend._id} aria-label={`Xem trang cá nhân ${friend.username}`}>
                                {friend.profilePicture ? <img src={friend.profilePicture} alt="" /> : (friend.username?.charAt(0).toUpperCase() || "?")}
                              </Link>
                              <Link className="connection-person-name profile-name-link" to={"/profile/" + friend._id}>{friend.username}</Link>
                              <button className="btn-outline" type="button" onClick={() => handleStartConversation(friend._id)}>Nhắn tin</button>
                              <button className="connection-unfriend-button" type="button" onClick={() => handleUnfriend(friend._id)}>Hủy kết bạn</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                    <section className="side-card">
                      <h2>{searchQuery ? "Kết quả tìm kiếm" : "Gợi ý kết bạn"}</h2>
                      {isLoadingPeople && <p>Đang tìm người dùng...</p>}
                      {peopleError && <p className="feedback-message error">{peopleError}</p>}
                      {!isLoadingPeople && !peopleError && people.length === 0 && (
                        <p>Chưa có người dùng phù hợp.</p>
                      )}
                      <div className="people-list">
                        {people.map((person) => (
                          <div className="person-row" key={person._id}>
                            <Link className="person-avatar" to={`/profile/${person._id}`} aria-label={`Xem trang cá nhân ${person.username}`}>
                              {person.profilePicture ? <img src={person.profilePicture} alt="" /> : (person.username?.charAt(0).toUpperCase() || "?")}
                            </Link>
                            <div className="person-info">
                              <Link className="profile-name-link" to={`/profile/${person._id}`}>{person.username}</Link>
                              {person.bio && <span>{person.bio}</span>}
                            </div>
                            <button
                              type="button"
                              disabled={sentRequestIds.includes(person._id) || sendingFriendRequestIds.includes(person._id)}
                              onClick={() => handleSendFriendRequest(person._id)}
                            >{sentRequestIds.includes(person._id) ? "Đã gửi" : "Kết bạn"}</button>
                            <button
                              className="block-user-button"
                              type="button"
                              onClick={() => handleBlockUser(person._id)}
                            >Chặn</button>
                          </div>
                        ))}
                      </div>
                    </section>
                  </section>
                ) : (
                  <>
                {activeSection !== "feed" && (
                  <h1 className="section-title">
                    {activeSection === "saved" ? "Bài viết đã lưu" :
                     activeSection === "activity" ? "Hoạt động của bạn" : "Reels"}
                  </h1>
                )}
                {activeSection === "feed" && <>
                <div className="stories-card card">
                  {storyFeedback && <p className="feedback-message error">{storyFeedback}</p>}
                  <div className="story-list">
                    <button
                      className="story-item"
                      type="button"
                      onClick={() => {
                        if (myStoryGroup) {
                          setActiveStoryGroup(myStoryGroup);
                          setActiveStoryIndex(0);
                        } else {
                          setStoryFeedback("");
                          setIsStoryComposerOpen(true);
                        }
                      }}
                    >
                      <span className="story-ring story-ring-add">
                        <span className="story-avatar story-self">
                          {currentUser?.profilePicture ? (
                            <img src={currentUser.profilePicture} alt="" />
                          ) : (currentUser?.username?.charAt(0).toUpperCase() || "R")}
                        </span>
                        <span className="story-add" aria-hidden="true">+</span>
                      </span>
                      <span className="story-name">Tin của bạn</span>
                    </button>
                    {storyGroups
                      .filter((group) => group.author._id !== currentUser?._id)
                      .map((group) => (
                        <button
                          className="story-item"
                          key={group.author._id}
                          type="button"
                          onClick={() => {
                            setActiveStoryGroup(group);
                            setActiveStoryIndex(0);
                          }}
                        >
                          <span className="story-ring">
                            <span className="story-avatar story-blue">
                              {group.author.profilePicture ? (
                                <img src={group.author.profilePicture} alt="" />
                              ) : (group.author.username?.charAt(0).toUpperCase() || "?")}
                            </span>
                          </span>
                          <span className="story-name">{group.author.username}</span>
                        </button>
                      ))}
                  </div>
                </div>

                <form className="create-post-card card" onSubmit={handleCreatePost}>
                  <h2>Tạo bài viết</h2>
                  <div className="composer-row">
                    <span className="composer-avatar">
                      {currentUser?.profilePicture ? <img src={currentUser.profilePicture} alt="" /> : (currentUser?.username?.charAt(0).toUpperCase() || "R")}
                    </span>
                    <textarea
                      className="create-post-input"
                      aria-label="Nội dung bài viết"
                      placeholder="Bạn đang nghĩ gì?"
                      rows="3"
                      maxLength="500"
                      value={postContent}
                      onChange={(event) => setPostContent(event.target.value)}
                    />
                  </div>
                  <p className="upload-hint">Ảnh hoặc video tùy chọn, tối đa 30 MB mỗi tệp.</p>
                  <div className="composer-actions">
                    <label className="chip">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-9 9" /></svg>
                      Ảnh
                      <input
                        id="post-image-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        aria-label="Chọn ảnh cho bài viết"
                        onChange={(event) => { setPostImageFile(event.target.files?.[0] || null); setPostVideoFile(null); }}
                      />
                    </label>
                    <label className="chip">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="3" /><path d="m16 10 5-3v10l-5-3" /></svg>
                      Video
                      <input
                        id="post-video-input"
                        type="file"
                        accept="video/mp4,video/webm"
                        aria-label="Chọn video cho bài viết"
                        onChange={(event) => { setPostVideoFile(event.target.files?.[0] || null); setPostImageFile(null); }}
                      />
                    </label>
                    {(postImageFile || postVideoFile) && (
                      <span className="selected-media-name">
                        {[postImageFile?.name, postVideoFile?.name].filter(Boolean).join(" · ")}
                      </span>
                    )}
                    <span className="composer-spacer" />
                    <label className="select-label">
                      Ai có thể xem?
                      <select value={postPrivacy} onChange={(event) => setPostPrivacy(event.target.value)}>
                        <option value="public">Mọi người</option>
                        <option value="friends">Bạn bè</option>
                        <option value="private">Chỉ mình tôi</option>
                      </select>
                    </label>
                    <button className="create-post-button btn-primary" type="submit" disabled={isPosting}>
                      {isPosting ? "Đang đăng..." : "Đăng bài"}
                    </button>
                  </div>

                  {postError && (
                    <p className="feedback-message error">{postError}</p>
                  )}
                </form>
                </>}
                {isLoading && <p>Đang tải bài viết...</p>}

{!isLoading && error && (
  <p className="feedback-message error">{error}</p>
)}

{!isLoading && !error && displayedPosts.length === 0 && (
  <p>{activeSection === "saved" ? "Bạn chưa lưu bài viết nào." : activeSection === "activity" ? "Bạn chưa đăng bài viết nào." : activeSection === "reels" ? "Chưa có Reels nào. Khi đăng bài, thêm đường dẫn video MP4 để bài xuất hiện tại đây." : "Chưa có bài viết nào."}</p>
)}
{!isLoading && !error && activeSection === "feed" && hasMorePosts && (
  <button className="create-post-button" type="button" onClick={handleLoadMorePosts} disabled={isLoadingMorePosts}>
    {isLoadingMorePosts ? "Đang tải..." : "Tải thêm bài viết"}
  </button>
)}
{likeError && (
  <p className="feedback-message error">{likeError}</p>
)}
{postActionError && (
  <p className="feedback-message error">{postActionError}</p>
)}
{!isLoading &&
  !error &&
  displayedPosts.map((post) => {
    const username = post.authorId?.username || "Người dùng";
    const visiblePost = post.originalPostId || post;
    const visibleAuthor = visiblePost.authorId?.username || username;
    const hasLiked = likedPostIds.includes(post._id);
    const visibilityLabel = post.privacy === "private" ? "Chỉ mình tôi" : post.privacy === "friends" ? "Bạn bè" : "Mọi người";
    const postDate = post.createdAt
      ? new Date(post.createdAt).toLocaleDateString("vi-VN", { day: "numeric", month: "short" })
      : "Mới đăng";
    const hasMedia = Boolean(visiblePost.image || visiblePost.video);

    return (
      <article className="post-card card" id={`post-${post._id}`} key={post._id}>
        <header className="post-header">
          <div className="post-author">
            <Link className="post-avatar" to={`/profile/${post.authorId?._id}`} aria-label={`Xem trang cá nhân ${username}`}>
              {post.authorId?.profilePicture ? (
                <img src={post.authorId.profilePicture} alt="" />
              ) : username.charAt(0).toUpperCase()}
            </Link>

            <div className="post-author-info">
              <Link className="profile-name-link" to={`/profile/${post.authorId?._id}`}>{username}</Link>
              <span className="post-meta">
                <span>Ridge</span><span aria-hidden="true">·</span>
                <span>{postDate}</span><span aria-hidden="true">·</span>
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
                <span>{visibilityLabel}</span>
              </span>
            </div>
          </div>

          <div className="post-menu-wrap">
            <button
              className="post-more"
              type="button"
              aria-label="Tùy chọn bài viết"
              aria-expanded={openPostMenuId === post._id}
              onClick={() => setOpenPostMenuId(
                openPostMenuId === post._id ? null : post._id
              )}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
            </button>
            {openPostMenuId === post._id && (
              <div className="post-menu" role="group" aria-label="Tùy chọn bài viết">
                <button type="button" onClick={() => {
                  handleToggleSavedPost(post._id, Boolean(post.isSaved));
                  setOpenPostMenuId(null);
                }}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" /></svg>
                  {post.isSaved ? "Bỏ lưu bài viết" : "Lưu bài viết"}
                </button>
                {!post.isMine && <button className="danger" type="button" onClick={() => {
                  setOpenPostMenuId(null);
                  handleReport("post", post._id);
                }}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4m0 0h11l-2 4 2 4H5" /></svg>
                  Báo cáo bài viết
                </button>}
                {post.isMine ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPostId(post._id);
                        setEditingPostContent(post.content);
                        setOpenPostMenuId(null);
                      }}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5 4 4M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20z" /></svg>
                      Chỉnh sửa bài viết
                    </button>
                    <button
                      className="post-menu-delete"
                      type="button"
                      onClick={() => handleDeletePost(post._id)}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3" /></svg>
                      Xóa bài viết
                    </button>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </header>

        {visiblePost.video ? (
          <video
            className="post-video"
            src={visiblePost.video}
            controls
            preload="metadata"
          />
        ) : visiblePost.image && !failedImagePostIds.includes(post._id) ? (
          <img
            className="post-image"
            src={visiblePost.image}
            alt={`Bài viết của ${username}`}
            onError={() => setFailedImagePostIds((ids) => [...ids, post._id])}
          />
        ) : null}

        {editingPostId === post._id ? (
          <form
            className="post-edit-form"
            onSubmit={(event) => handleUpdatePost(event, post._id)}
          >
            <textarea
              value={editingPostContent}
              onChange={(event) => setEditingPostContent(event.target.value)}
              maxLength="500"
              aria-label="Chỉnh sửa nội dung bài viết"
            />
            <div>
              <button type="submit" disabled={isSavingPost}>
                {isSavingPost ? "Đang lưu..." : "Lưu"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingPostId(null);
                  setEditingPostContent("");
                  setPostActionError("");
                }}
              >
                Hủy
              </button>
            </div>
          </form>
        ) : hasMedia ? (
          <p className="post-caption">
            <strong>{username}</strong>{" "}
            {post.originalPostId && <span className="shared-post-by">Chia sẻ từ {visibleAuthor}: </span>}
            {visiblePost.content}
          </p>
        ) : (
          <p className="post-text">{visiblePost.content}</p>
        )}

        <p className="post-likes">
          {post.likes?.length ?? 0} lượt thích
        </p>

        <div className="post-actions">
          <div className="post-action-group">
            <button
              className={`post-action-button ${hasLiked ? "liked" : ""}`}
              type="button"
              aria-label={hasLiked ? "Bỏ thích" : "Thích"}
              aria-pressed={hasLiked}
              onClick={() => handleLike(post._id, hasLiked)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5c0 6.1-8 11-8 11z" /></svg>
              <span>{hasLiked ? "Đã thích" : "Thích"}</span>
            </button>
            <button className="post-action-button" type="button" aria-label="Bình luận" onClick={() => handleToggleComments(post._id)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15a3 3 0 0 1-3 3H9l-5 4V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z" /></svg><span>Bình luận</span>
            </button>
            <button className="post-action-button" type="button" aria-label="Chia sẻ bài viết" onClick={() => handleSharePost(post._id)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 3 11 14M22 3l-7 18-4-7-7-4z" /></svg><span>Chia sẻ</span>
            </button>
          </div>

          <button
            className={`post-action-button ${post.isSaved ? "saved" : ""}`}
            type="button"
            aria-label={post.isSaved ? "Bỏ lưu bài viết" : "Lưu bài viết"}
            aria-pressed={Boolean(post.isSaved)}
            onClick={() => handleToggleSavedPost(post._id, Boolean(post.isSaved))}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" /></svg>
          </button>
        </div>

        {openCommentsFor === post._id && (
          <div>
          <div className="comments-list">
            {isLoadingComments && <p>Đang tải bình luận...</p>}

            {!isLoadingComments && commentError && (
              <p className="feedback-message error">{commentError}</p>
            )}

            {!isLoadingComments && !commentError && comments.length === 0 && (
              <p>Chưa có bình luận nào.</p>
            )}

            {!isLoadingComments &&
              !commentError &&
              comments.map((comment) => (
                <div className="comment-item" key={comment._id}>
                  <Link className="comment-avatar" to={`/profile/${comment.authorId?._id}`} aria-label={`Xem trang cá nhân ${comment.authorId?.username || "người dùng"}`}>
                    {comment.authorId?.profilePicture ? (
                      <img src={comment.authorId.profilePicture} alt="" />
                    ) : (comment.authorId?.username || "U").charAt(0).toUpperCase()}
                  </Link>
                  <div className="comment-main">
                    {editingCommentId === comment._id ? (
                      <form
                        className="comment-edit-form"
                        onSubmit={(event) => handleUpdateComment(event, comment._id)}
                      >
                        <input
                          aria-label="Sửa nội dung bình luận"
                          value={editingCommentContent}
                          onChange={(event) => setEditingCommentContent(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              setEditingCommentId(null);
                              setEditingCommentContent("");
                            }
                          }}
                          maxLength="500"
                        />
                        <div className="comment-edit-actions">
                          <button type="submit" disabled={isUpdatingComment}>
                            {isUpdatingComment ? "Đang lưu..." : "Lưu"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditingCommentContent("");
                            }}
                          >
                            Hủy
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="comment-bubble">
                          <Link className="profile-name-link" to={`/profile/${comment.authorId?._id}`}>{comment.authorId?.username || "Người dùng"}</Link>
                          <p>{comment.content}</p>
                        </div>
                        <div className="comment-controls">
                          {comment.isMine ? (
                            <>
                              <button
                                className="comment-icon-button"
                                type="button"
                                aria-label="Sửa bình luận"
                                onClick={() => {
                                  setEditingCommentId(comment._id);
                                  setEditingCommentContent(comment.content);
                                }}
                              >
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5 4 4M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20z" /></svg>
                              </button>
                              <button
                                className="comment-icon-button comment-delete-button"
                                type="button"
                                aria-label="Xóa bình luận"
                                onClick={() => handleDeleteComment(comment._id)}
                              >
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3" /></svg>
                              </button>
                            </>
                          ) : (
                            <button className="comment-report-button" type="button" onClick={() => handleReport("comment", comment._id)}>Báo cáo</button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
          </div>
          <form
            className="comment-form"
            onSubmit={(event) => handleCreateComment(event, post._id)}
          >
            <input
              type="text"
              placeholder="Viết bình luận..."
              aria-label="Viết bình luận"
              maxLength="500"
              value={commentContent}
              onChange={(event) => setCommentContent(event.target.value)}
            />

            <button type="submit" disabled={isSendingComment}>
              {isSendingComment ? "Đang gửi..." : "Gửi"}
            </button>
          </form>
          </div>
        )}
      </article>
    );
  })}
                  </>
                )}
                </section>
                {activeSection === "feed" && <aside className="right-column">
                  <section className="contacts-panel">
                    <h2>Người liên hệ</h2>
                    {friends.length === 0 ? <p className="friends-empty">Bạn chưa có bạn bè nào.</p> : (
                      <div className="contacts-list">
                        {friends.map((friend) => (
                          <button className="contact-row" type="button" key={friend._id} onClick={() => handleStartConversation(friend._id)}>
                            <span className="contact-avatar">
                              {friend.profilePicture ? <img src={friend.profilePicture} alt="" /> : (friend.username?.charAt(0).toUpperCase() || "?")}
                            </span>
                            <span>{friend.username}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                </aside>}
            {isStoryComposerOpen && (
              <div className="modal-backdrop">
                <section className="story-dialog" role="dialog" aria-modal="true" aria-labelledby="story-dialog-title">
                  <h2 id="story-dialog-title">Đăng story</h2>
                  <p>Story sẽ tự hết hạn sau 24 giờ. Chọn ảnh hoặc video tối đa 30 MB từ thiết bị.</p>
                  <form onSubmit={handleCreateStory}>
                    <label>
                      Ảnh hoặc video
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                        onChange={(event) => setStoryFile(event.target.files?.[0] || null)}
                        required
                      />
                    </label>
                    {storyFile && <p className="selected-media-name">{storyFile.name}</p>}
                    {storyFeedback && <p className="feedback-message error">{storyFeedback}</p>}
                    <div className="dialog-actions">
                      <button type="button" onClick={() => setIsStoryComposerOpen(false)}>Hủy</button>
                      <button type="submit" disabled={isPostingStory}>
                        {isPostingStory ? "Đang đăng..." : "Đăng story"}
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            )}
            {activeStoryGroup && currentStory && (
              <div className="modal-backdrop">
                <section className="story-viewer" role="dialog" aria-modal="true" aria-label="Xem story">
                  <header>
                    <div className="story-viewer-author">
                      <strong>{activeStoryGroup.author.username}</strong>
                      <span>{activeStoryIndex + 1} / {activeStoryGroup.items.length}</span>
                    </div>
                    <button type="button" aria-label="Đóng story" onClick={() => setActiveStoryGroup(null)}>×</button>
                  </header>
                  {currentStory.mediaType === "video" ? (
                    <video src={currentStory.mediaUrl} controls autoPlay />
                  ) : (
                    <img src={currentStory.mediaUrl} alt={`Story của ${activeStoryGroup.author.username}`} />
                  )}
                  <footer>
                    {activeStoryGroup.author._id === currentUser?._id && (
                      <button className="story-delete-button" type="button" onClick={() => handleDeleteStory(currentStory._id)}>
                        Xóa story
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={activeStoryIndex === 0}
                      onClick={() => setActiveStoryIndex((index) => index - 1)}
                    >Trước</button>
                    <button
                      type="button"
                      disabled={activeStoryIndex >= activeStoryGroup.items.length - 1}
                      onClick={() => setActiveStoryIndex((index) => index + 1)}
                    >Tiếp</button>
                  </footer>
                </section>
              </div>
            )}
            <ReportDialog
              key={reportTarget?.targetId || "closed"}
              open={Boolean(reportTarget)}
              targetType={reportTarget?.targetType}
              onClose={() => setReportTarget(null)}
              onSubmit={submitReport}
            />
            <Toast message={shareFeedback} onDismiss={() => setShareFeedback("")} />
        </>
        );
}
export default FeedPage;
