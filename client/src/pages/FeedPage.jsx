import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import MessagesView from "../components/MessagesView.jsx";
import ProfileSettings from "../components/ProfileSettings.jsx";
import { uploadMedia } from "../lib/uploadMedia.js";
function FeedPage(){
    const navigate = useNavigate();
    const location = useLocation();
    const [activeSection, setActiveSection] = useState("feed");
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [profileError, setProfileError] = useState("");
    const [postContent, setPostContent] = useState("");
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
    const [currentUser, setCurrentUser] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [notificationError, setNotificationError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [people, setPeople] = useState([]);
    const [isLoadingPeople, setIsLoadingPeople] = useState(false);
    const [peopleError, setPeopleError] = useState("");
    const [sentRequestIds, setSentRequestIds] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [isLoadingFriendRequests, setIsLoadingFriendRequests] = useState(false);
    const [friendRequestError, setFriendRequestError] = useState("");
    const [friends, setFriends] = useState([]);
    const [messagesReload, setMessagesReload] = useState(0);
    const [shareFeedback, setShareFeedback] = useState("");
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
      async function loadCurrentUser() {
        try {
          const token = localStorage.getItem("token");
          const response = await fetch("http://localhost:5000/api/user/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || "Không thể tải hồ sơ người dùng.");
          }
          setCurrentUser(data.user);
        } catch (requestError) {
          setProfileError(requestError.message);
        }
      }

      loadCurrentUser();
    }, []);

    useEffect(() => {
      async function loadNotifications() {
        try {
          const token = localStorage.getItem("token");
          const response = await fetch("http://localhost:5000/api/notification", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || "Không thể tải thông báo.");
          }
          setNotifications(data.notifications);
        } catch (requestError) {
          setNotificationError(requestError.message);
        }
      }

      loadNotifications();
    }, []);

    useEffect(() => {
      if (activeSection !== "connections") return undefined;
      const controller = new AbortController();
      async function loadFriendRequests() {
        setIsLoadingFriendRequests(true);
        setFriendRequestError("");
        try {
          const token = localStorage.getItem("token");
          const response = await fetch("http://localhost:5000/api/friend/requests", {
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
          const response = await fetch("http://localhost:5000/api/story", {
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
          const response = await fetch("http://localhost:5000/api/friend", {
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
            `http://localhost:5000/api/user/search?q=${encodeURIComponent(searchQuery)}`,
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

            const response = await fetch("http://localhost:5000/api/post", {
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
            setPosts(data.posts);
            setLikedPostIds(
              data.posts
                .filter((post) => post.isLiked)
                .map((post) => post._id)
            );
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
        }

        loadPosts();
    }, [reloadPosts]);

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

        const response = await fetch("http://localhost:5000/api/post", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content,
            image: uploadedImage?.url || "",
            video: uploadedVideo?.url || "",
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Không thể đăng bài.");
        }

        setPostContent("");
        setPostImageFile(null);
        setPostVideoFile(null);
        form.reset();
        setReloadPosts((currentValue) => currentValue + 1);
      } catch (requestError) {
        setPostError(requestError.message);
      } finally {
        setIsPosting(false);
      }
    }
    async function handleDeletePost(postId) {
      if (!window.confirm("Bạn có chắc muốn xóa bài viết này?")) {
        return;
      }

      setPostActionError("");

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`http://localhost:5000/api/post/${postId}`, {
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
        const response = await fetch(`http://localhost:5000/api/post/${postId}`, {
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
        const response = await fetch(`http://localhost:5000/api/post/${postId}/save`, {
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
      const postUrl = new URL("/feed", window.location.origin);
      postUrl.hash = `post-${postId}`;
      try {
        await navigator.clipboard.writeText(postUrl.toString());
        setShareFeedback("Đã sao chép liên kết bài viết.");
        window.setTimeout(() => setShareFeedback(""), 2500);
      } catch {
        setPostActionError("Trình duyệt không cho phép sao chép liên kết.");
      }
    }
    async function handleToggleNotifications() {
      if (isNotificationOpen) {
        setIsNotificationOpen(false);
        return;
      }

      setIsNotificationOpen(true);
      setNotificationError("");

      try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/notification", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Không thể tải thông báo.");
        }
        setNotifications(data.notifications);
      } catch (requestError) {
        setNotificationError(requestError.message);
      }
    }
    async function handleReadNotification(notificationId) {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `http://localhost:5000/api/notification/${notificationId}/read`,
          {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Không thể cập nhật thông báo.");
        }
        setNotifications((currentNotifications) => currentNotifications.map(
          (notification) => notification._id === notificationId
            ? { ...notification, isRead: true }
            : notification
        ));
      } catch (requestError) {
        setNotificationError(requestError.message);
      }
    }
    async function handleSendFriendRequest(userId) {
      setPeopleError("");
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `http://localhost:5000/api/friend/request/${userId}`,
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
      }
    }
    async function handleBlockUser(userId) {
      if (!window.confirm("Bạn có chắc muốn chặn người dùng này?")) return;
      setPeopleError("");
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`http://localhost:5000/api/user/block/${userId}`, {
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
          `http://localhost:5000/api/friend/request/${requestId}/${action}`,
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
          `http://localhost:5000/api/message/conversation/${userId}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Không thể mở cuộc trò chuyện.");
        }
        setMessagesReload((currentValue) => currentValue + 1);
        setActiveSection("messages");
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
        const response = await fetch("http://localhost:5000/api/story", {
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
      if (!window.confirm("Bạn có chắc muốn xóa story này?")) return;

      setStoryFeedback("");
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`http://localhost:5000/api/story/${storyId}`, {
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
          `http://localhost:5000/api/post/${postId}/like`,
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
          `http://localhost:5000/api/comment/${postId}`,
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
          `http://localhost:5000/api/comment/${postId}`,
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
          `http://localhost:5000/api/comment/${postId}`,
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
      const confirmed = window.confirm("Bạn có chắc muốn xóa bình luận này?");

      if (!confirmed) {
        return;
      }

      setCommentError("");

      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `http://localhost:5000/api/comment/${commentId}`,
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
          `http://localhost:5000/api/comment/${commentId}`,
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
    function handleLogout(){
        localStorage.removeItem("token");
        navigate("/", {replace: true})
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
        <main className="home-layout">
            <aside className="home-sidebar">
            <div className="home-brand">
                <span className="home-brand-icon">R</span>
                <span>Ridge</span>
            </div>

            <nav className="home-menu">
                <button className={`menu-item ${activeSection === "feed" ? "active" : ""}`} type="button" onClick={() => setActiveSection("feed")}>News Feed</button>
                <button className={`menu-item ${activeSection === "messages" ? "active" : ""}`} type="button" onClick={() => setActiveSection("messages")}>Messages</button>
                <button className={`menu-item ${activeSection === "connections" ? "active" : ""}`} type="button" onClick={() => setActiveSection("connections")}>Kết bạn</button>
                <button className={`menu-item ${activeSection === "reels" ? "active" : ""}`} type="button" onClick={() => setActiveSection("reels")}>Reels</button>
                <button className={`menu-item ${activeSection === "saved" ? "active" : ""}`} type="button" onClick={() => setActiveSection("saved")}>Saved</button>
                <button className={`menu-item ${activeSection === "activity" ? "active" : ""}`} type="button" onClick={() => setActiveSection("activity")}>Your Activity</button>
                <button className={`menu-item ${activeSection === "settings" ? "active" : ""}`} type="button" onClick={() => setActiveSection("settings")}>Setting</button>
            </nav>

            <button className="logout-button" type="button" onClick={handleLogout}>
                Đăng xuất
            </button>
            </aside>

            <section className="home-content">
            <header className="home-topbar">
                <input
                  type="search"
                  placeholder="Tìm người dùng..."
                  value={searchQuery}
                  onFocus={() => setActiveSection("connections")}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                <div className="topbar-user">
                <div className="notification-wrap">
                  <button
                    className="notification-button"
                    type="button"
                    aria-label="Thông báo"
                    aria-expanded={isNotificationOpen}
                    onClick={handleToggleNotifications}
                  >
                    🔔
                    {notifications.some((notification) => !notification.isRead) && (
                      <span className="notification-dot" />
                    )}
                  </button>
                  {isNotificationOpen && (
                    <div className="notification-panel">
                      <h2>Thông báo</h2>
                      {notificationError && (
                        <p className="feedback-message error">{notificationError}</p>
                      )}
                      {!notificationError && notifications.length === 0 && (
                        <p>Chưa có thông báo nào.</p>
                      )}
                      {notifications.map((notification) => (
                        <button
                          className={`notification-item ${notification.isRead ? "read" : "unread"}`}
                          key={notification._id}
                          type="button"
                          onClick={() => handleReadNotification(notification._id)}
                        >
                          <strong>{notification.senderId?.username || "Người dùng"}</strong>{" "}
                          {notification.type === "like" ? "đã thích bài viết của bạn" :
                           notification.type === "comment" ? "đã bình luận bài viết của bạn" :
                           notification.type === "friend_request" ? "đã gửi lời mời kết bạn" :
                           notification.type === "friend_accept" ? "đã chấp nhận lời mời kết bạn" :
                           notification.type === "message" ? "đã gửi tin nhắn cho bạn" :
                           "có cập nhật mới"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span className="user-avatar">
                  {currentUser?.profilePicture ? (
                    <img src={currentUser.profilePicture} alt="Ảnh đại diện" />
                  ) : (currentUser?.username?.charAt(0).toUpperCase() || "R")}
                </span>
                <span>{currentUser?.username || "Tài khoản"}</span>
                </div>
            </header>
            {profileError && <p className="profile-load-error">{profileError}</p>}

            <div className="home-columns">
                <section className="feed-column">
                {activeSection === "messages" ? (
                  <MessagesView currentUser={currentUser} reloadKey={messagesReload} />
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
                              <strong>{request.senderId?.username || "Người dùng"}</strong>
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
                            <span className="person-avatar">
                              {person.profilePicture ? <img src={person.profilePicture} alt="" /> : (person.username?.charAt(0).toUpperCase() || "?")}
                            </span>
                            <div className="person-info">
                              <strong>{person.username}</strong>
                              {person.bio && <span>{person.bio}</span>}
                            </div>
                            <button
                              type="button"
                              disabled={sentRequestIds.includes(person._id)}
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
                <div className="stories-card">
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
                      <span className="story-avatar story-self">
                        {currentUser?.profilePicture ? (
                          <img src={currentUser.profilePicture} alt="" />
                        ) : (currentUser?.username?.charAt(0).toUpperCase() || "R")}
                        <span className="story-add">+</span>
                      </span>
                      <span className="story-name">Your Story</span>
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
                          <span className="story-avatar story-blue">
                            {group.author.profilePicture ? (
                              <img src={group.author.profilePicture} alt="" />
                            ) : (group.author.username?.charAt(0).toUpperCase() || "?")}
                          </span>
                          <span className="story-name">{group.author.username}</span>
                        </button>
                      ))}
                  </div>
                </div>

                <form className="create-post-card" onSubmit={handleCreatePost}>
                  <h2>Tạo bài viết</h2>
                  <p className="upload-hint">Ảnh hoặc video tùy chọn, tối đa 30 MB mỗi tệp.</p>
                  <input
                    className="create-post-image-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    aria-label="Chọn ảnh cho bài viết"
                    onChange={(event) => setPostImageFile(event.target.files?.[0] || null)}
                  />
                  <input
                    className="create-post-image-input"
                    type="file"
                    accept="video/mp4,video/webm"
                    aria-label="Chọn video cho Reels"
                    onChange={(event) => setPostVideoFile(event.target.files?.[0] || null)}
                  />
                  {(postImageFile || postVideoFile) && (
                    <p className="selected-media-name">
                      {[postImageFile?.name, postVideoFile?.name].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <textarea
                    className="create-post-input"
                    placeholder="Bạn đang nghĩ gì?"
                    rows="3"
                    maxLength="500"
                    value={postContent}
                    onChange={(event) => setPostContent(event.target.value)}
                  />

                  {postError && (
                    <p className="feedback-message error">{postError}</p>
                  )}
                  <button
                    className="create-post-button"
                    type="submit"
                    disabled={isPosting}
                  >
                    {isPosting ? "Đang đăng..." : "Đăng bài"}
                  </button>
                </form>
                </>}
                {isLoading && <p>Đang tải bài viết...</p>}

{!isLoading && error && (
  <p className="feedback-message error">{error}</p>
)}

{!isLoading && !error && displayedPosts.length === 0 && (
  <p>{activeSection === "saved" ? "Bạn chưa lưu bài viết nào." : activeSection === "activity" ? "Bạn chưa đăng bài viết nào." : activeSection === "reels" ? "Chưa có Reels nào. Khi đăng bài, thêm đường dẫn video MP4 để bài xuất hiện tại đây." : "Chưa có bài viết nào."}</p>
)}
{shareFeedback && <p className="feedback-message success">{shareFeedback}</p>}
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
    const hasLiked = likedPostIds.includes(post._id);

    return (
      <article className="post-card" id={`post-${post._id}`} key={post._id}>
        <header className="post-header">
          <div className="post-author">
            <span className="post-avatar">
              {post.authorId?.profilePicture ? (
                <img src={post.authorId.profilePicture} alt="" />
              ) : username.charAt(0).toUpperCase()}
            </span>

            <div className="post-author-info">
              <strong>{username}</strong>
              <span>Ridge</span>
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
              •••
            </button>
            {openPostMenuId === post._id && (
              <div className="post-menu">
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
                      Chỉnh sửa bài viết
                    </button>
                    <button
                      className="post-menu-delete"
                      type="button"
                      onClick={() => handleDeletePost(post._id)}
                    >
                      Xóa bài viết
                    </button>
                  </>
                ) : (
                  <span>Chỉ chủ bài viết mới có thể chỉnh sửa hoặc xóa.</span>
                )}
              </div>
            )}
          </div>
        </header>

        {activeSection === "reels" && post.video ? (
          <video
            className="post-video"
            src={post.video}
            controls
            preload="metadata"
          />
        ) : post.image && !failedImagePostIds.includes(post._id) ? (
          <img
            className="post-image"
            src={post.image}
            alt={`Bài viết của ${username}`}
            onError={() => setFailedImagePostIds((ids) => [...ids, post._id])}
          />
        ) : (
          <div className="post-image-placeholder">Bài viết không có ảnh</div>
        )}

        <div className="post-actions">
          <div className="post-action-group">
            <button
              className={`post-action-button ${hasLiked ? "liked" : ""}`}
              type="button"
              aria-label={hasLiked ? "Bỏ thích" : "Thích"}
              onClick={() => handleLike(post._id, hasLiked)}
            >
              {hasLiked ? "♥" : "♡"}
            </button>
            <button className="post-action-button" type="button" aria-label="Bình luận" onClick={() => handleToggleComments(post._id)}>
              ▢
            </button>
            <button className="post-action-button" type="button" aria-label="Sao chép liên kết bài viết" onClick={() => handleSharePost(post._id)}>
              ➤
            </button>
          </div>

          <button
            className={`post-action-button ${post.isSaved ? "saved" : ""}`}
            type="button"
            aria-label={post.isSaved ? "Bỏ lưu bài viết" : "Lưu bài viết"}
            aria-pressed={Boolean(post.isSaved)}
            onClick={() => handleToggleSavedPost(post._id, Boolean(post.isSaved))}
          >
            {post.isSaved ? "▣" : "♧"}
          </button>
        </div>

        <p className="post-likes">
          {post.likes?.length ?? 0} lượt thích
        </p>

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
        ) : (
          <p className="post-caption">
            <strong>{username}</strong>{" "}
            {post.content}
          </p>
        )}
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
                  {editingCommentId === comment._id ? (
                    <form
                      className="comment-edit-form"
                      onSubmit={(event) => handleUpdateComment(event, comment._id)}
                    >
                      <input
                        value={editingCommentContent}
                        onChange={(event) => setEditingCommentContent(event.target.value)}
                        maxLength="500"
                      />

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
                    </form>
                  ) : (
                    <>
                      <p>
                        <strong>{comment.authorId?.username || "Người dùng"}</strong>{" "}
                        {comment.content}
                      </p>

                      {comment.isMine && (
                        <div className="comment-controls">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCommentId(comment._id);
                              setEditingCommentContent(comment.content);
                            }}
                          >
                            Sửa
                          </button>

                          <button
                            className="comment-delete-button"
                            type="button"
                            onClick={() => handleDeleteComment(comment._id)}
                          >
                            Xóa
                          </button>
                        </div>
                      )}
                    </>
                  )}
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
                <aside className="right-column">
                {friends.length > 0 && (
                  <section className="side-card">
                    <h2>Bạn bè</h2>
                    <div className="people-list">
                      {friends.map((friend) => (
                        <div className="person-row" key={friend._id}>
                          <span className="person-avatar">
                            {friend.profilePicture ? (
                              <img src={friend.profilePicture} alt="" />
                            ) : (friend.username?.charAt(0).toUpperCase() || "?")}
                          </span>
                          <div className="person-info">
                            <strong>{friend.username}</strong>
                          </div>
                          <button type="button" onClick={() => handleStartConversation(friend._id)}>
                            Nhắn tin
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                </aside>
            </div>
            </section>
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
        </main>
        );
}
export default FeedPage;
