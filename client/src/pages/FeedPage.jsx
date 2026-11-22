import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import MessagesView from "../components/MessagesView.jsx";
import ProfileSettings from "../components/ProfileSettings.jsx";
import AdminPanel from "../components/AdminPanel.jsx";
import { uploadMedia } from "../lib/uploadMedia.js";
import { API_BASE } from "../lib/api.js";
import { sendReaction } from "../lib/reactions.js";
import { mergeSavedPost } from "../lib/mergeSavedPost.js";
import { useConfirm } from "../components/ConfirmDialog.jsx";
import ReportDialog from "../components/ReportDialog.jsx";
import Toast from "../components/Toast.jsx";
import PostCard from "../components/PostCard.jsx";
import ContactsPanel from "../components/feed/ContactsPanel.jsx";
import FriendsView from "../components/feed/FriendsView.jsx";
import ConnectionsView from "../components/feed/ConnectionsView.jsx";
import StoryStrip from "../components/feed/StoryStrip.jsx";
import LoadMoreSentinel from "../components/feed/LoadMoreSentinel.jsx";
import PostComposer from "../components/feed/PostComposer.jsx";
import StoryComposer from "../components/StoryComposer.jsx";
import StoryViewer from "../components/StoryViewer.jsx";
import "../newsfeed.css";
import "../stories.css";

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
    const [replyTo, setReplyTo] = useState(null); // { rootId, username } while answering a comment
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
    const [friendSearch, setFriendSearch] = useState("");
    const normalizeFriendName = (name = "") => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();
    const filteredFriends = friends.filter((friend) => normalizeFriendName(friend.username || "").includes(normalizeFriendName(friendSearch)));
    const sortedContactFriends = [...friends].sort((first, second) =>
      Number(Boolean(second.isOnline)) - Number(Boolean(first.isOnline)) ||
      String(first.username || "").localeCompare(String(second.username || ""), "vi", { sensitivity: "base" })
    );
    const [shareFeedback, setShareFeedback] = useState("");
    const [reportTarget, setReportTarget] = useState(null);
    const [failedImagePostIds, setFailedImagePostIds] = useState([]);
    const [stories, setStories] = useState([]);
    const [storyReloadKey, setStoryReloadKey] = useState(0);
    const [isStoryComposerOpen, setIsStoryComposerOpen] = useState(false);
    const [storyFile, setStoryFile] = useState(null);
    const [isPostingStory, setIsPostingStory] = useState(false);
    const [storyFeedback, setStoryFeedback] = useState("");
    const [storyToast, setStoryToast] = useState("");
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
      let mounted = true;
      let loading = false;
      async function loadFriends() {
        if (loading) return;
        loading = true;
        try {
          const token = localStorage.getItem("token");
          const response = await fetch(`${API_BASE}/api/friend`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          if (mounted && response.ok) setFriends(data.friend || []);
        } catch {
          // Friend suggestions and feed remain usable if this optional list fails.
        } finally {
          loading = false;
        }
      }

      void loadFriends();
      const refreshInterval = window.setInterval(loadFriends, 60_000);
      return () => {
        mounted = false;
        window.clearInterval(refreshInterval);
      };
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

    function handlePostImageFileChange(file) {
      setPostImageFile(file);
      setPostVideoFile(null);
    }
    function handlePostVideoFileChange(file) {
      setPostVideoFile(file);
      setPostImageFile(null);
    }
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
          post._id === postId ? mergeSavedPost(post, data.post) : post
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
      if (isLoading || isLoadingMorePosts) return;
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
    async function handleUnfriend(friend) {
      if (!(await confirmAction({
        title: "Hủy kết bạn",
        message: `Bạn có chắc muốn hủy kết bạn với ${friend.username}?`,
        confirmLabel: "Hủy kết bạn",
        danger: true,
      }))) return;

      const userId = friend._id;
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
    function handleOpenStory(group) {
      setActiveStoryGroup(group);
      setActiveStoryIndex(0);
    }
    function handleAddStory() {
      setStoryFeedback("");
      setStoryFile(null);
      setIsStoryComposerOpen(true);
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
        setStoryToast(data.message);
        setStoryReloadKey((value) => value + 1);
      } catch (requestError) {
        setStoryFeedback(requestError.message);
      } finally {
        setIsPostingStory(false);
      }
    }
    async function handleDeleteStory(storyId) {
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
        return true;
      } catch (requestError) {
        setStoryFeedback(requestError.message);
        return false;
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
    async function handleReactPost(post, type) {
      setLikeError("");
      try {
        const data = await sendReaction(`/api/post/${post._id}/reaction`, type);
        setPosts((currentPosts) => currentPosts.map((item) =>
          item._id === post._id ? { ...item, reactions: data.reactions, likes: data.likes, isLiked: Boolean(type) } : item
        ));
        setLikedPostIds((currentIds) => type
          ? (currentIds.includes(post._id) ? currentIds : [...currentIds, post._id])
          : currentIds.filter((id) => id !== post._id));
      } catch (requestError) {
        setLikeError(requestError.message);
      }
    }
    async function handleReactComment(comment, type) {
      setCommentError("");
      try {
        const data = await sendReaction(`/api/comment/${comment._id}/reaction`, type);
        setComments((currentComments) => currentComments.map((item) =>
          item._id === comment._id ? { ...item, reactions: data.reactions } : item
        ));
      } catch (requestError) {
        setCommentError(requestError.message);
      }
    }
    async function handleToggleComments(postId) {
      setReplyTo(null);
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
            body: JSON.stringify(replyTo ? { content, parentId: replyTo.rootId } : { content }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Không thể gửi bình luận.");
        }

        setPosts((currentPosts) => currentPosts.map((post) => post._id === postId
          ? { ...post, commentsCount: (post.commentsCount || 0) + 1 }
          : post));

        setCommentContent("");
        setReplyTo(null);

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
    async function handleDeleteComment(commentId, postId = openCommentsFor) {
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

        // Deleting a comment also deletes its replies (the server says how many went).
        const removedCount = Number(data.removed) || 1;
        setComments((currentComments) =>
          currentComments.filter((comment) => comment._id !== commentId && String(comment.parentId || "") !== String(commentId))
        );
        setReplyTo((current) => current && current.rootId === commentId ? null : current);
        setPosts((currentPosts) => currentPosts.map((post) => post._id === postId
          ? { ...post, commentsCount: Math.max(0, (post.commentsCount || 0) - removedCount) }
          : post));
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
                  <FriendsView friends={friends} navigate={navigate} />
                ) : activeSection === "connections" ? (
                  <ConnectionsView friendRequests={friendRequests} friendRequestError={friendRequestError} isLoadingFriendRequests={isLoadingFriendRequests} handleFriendRequestAction={handleFriendRequestAction} friendSearch={friendSearch} setFriendSearch={setFriendSearch} friends={friends} filteredFriends={filteredFriends} handleStartConversation={handleStartConversation} handleUnfriend={handleUnfriend} searchQuery={searchQuery} isLoadingPeople={isLoadingPeople} peopleError={peopleError} people={people} sentRequestIds={sentRequestIds} sendingFriendRequestIds={sendingFriendRequestIds} handleSendFriendRequest={handleSendFriendRequest} handleBlockUser={handleBlockUser} />
                ) : (
                  <>
                {activeSection !== "feed" && (
                  <h1 className="section-title">
                    {activeSection === "saved" ? "Bài viết đã lưu" :
                     "Hoạt động của bạn"}
                  </h1>
                )}
                {activeSection === "feed" && <>
                <StoryStrip currentUser={currentUser} myStoryGroup={myStoryGroup} storyGroups={storyGroups} storyFeedback={storyFeedback} onOpenStory={handleOpenStory} onAddStory={handleAddStory} />

                <PostComposer currentUser={currentUser} postContent={postContent} onPostContentChange={setPostContent} postPrivacy={postPrivacy} onPostPrivacyChange={setPostPrivacy} postImageFile={postImageFile} postVideoFile={postVideoFile} onImageFileChange={handlePostImageFileChange} onVideoFileChange={handlePostVideoFileChange} isPosting={isPosting} postError={postError} onSubmit={handleCreatePost} />
                </>}
                {isLoading && <p>Đang tải bài viết...</p>}

{!isLoading && error && (
  <p className="feedback-message error">{error}</p>
)}

{!isLoading && !error && displayedPosts.length === 0 && (
  <p>{activeSection === "saved" ? "Bạn chưa lưu bài viết nào." : activeSection === "activity" ? "Bạn chưa đăng bài viết nào." : "Chưa có bài viết nào."}</p>
)}
{likeError && (
  <p className="feedback-message error">{likeError}</p>
)}
{postActionError && (
  <p className="feedback-message error">{postActionError}</p>
)}
{!isLoading && !error && displayedPosts.map((post) => <PostCard
  key={post._id}
  post={post}
  currentUser={currentUser}
  isLiked={post.isLiked ?? likedPostIds.includes(post._id)}
  commentsCount={post.commentsCount ?? 0}
  failedImagePost={failedImagePostIds.includes(post._id)}
  editingPostId={editingPostId}
  editingPostContent={editingPostContent}
  isSavingPost={isSavingPost}
  postActionError={postActionError}
  commentsOpen={openCommentsFor === post._id}
  comments={comments}
  isLoadingComments={isLoadingComments}
  commentError={commentError}
  commentContent={commentContent}
  isSendingComment={isSendingComment}
  editingCommentId={editingCommentId}
  editingCommentContent={editingCommentContent}
  isUpdatingComment={isUpdatingComment}
  onLike={(item) => handleLike(item._id, Boolean(item.isLiked ?? likedPostIds.includes(item._id)))}
  onReact={handleReactPost}
  onReactComment={handleReactComment}
  replyTo={openCommentsFor === post._id ? replyTo : null}
  mentionCandidates={friends}
  onReplyComment={(item) => {
    setReplyTo({ rootId: item.parentId || item._id, username: item.authorId?.username || "người dùng" });
    setCommentContent(item.authorId?.username ? `@${item.authorId.username} ` : "");
  }}
  onCancelReply={() => { setReplyTo(null); setCommentContent(""); }}
  onToggleComments={(item) => handleToggleComments(item._id)}
  onShare={(item) => handleSharePost(item._id)}
  onToggleSaved={(item, saved) => handleToggleSavedPost(item._id, saved)}
  onStartEdit={(item) => { setEditingPostId(item._id); setEditingPostContent(item.content || ''); }}
  onEditingPostContentChange={setEditingPostContent}
  onUpdatePost={(event, item) => handleUpdatePost(event, item._id)}
  onCancelEditPost={() => { setEditingPostId(null); setEditingPostContent(''); setPostActionError(''); }}
  onDeletePost={(item) => handleDeletePost(item._id)}
  onReportPost={(item) => handleReport('post', item._id)}
  onCommentChange={setCommentContent}
  onCreateComment={(event, item) => handleCreateComment(event, item._id)}
  onCommentEdit={(item) => { setEditingCommentId(item._id); setEditingCommentContent(item.content); }}
  onCommentEditingChange={setEditingCommentContent}
  onCancelCommentEdit={() => { setEditingCommentId(null); setEditingCommentContent(''); }}
  onUpdateComment={handleUpdateComment}
  onDeleteComment={(item) => handleDeleteComment(item._id, post._id)}
  onReportComment={(item) => handleReport('comment', item._id)}
  onImageError={(item) => setFailedImagePostIds((ids) => ids.includes(item._id) ? ids : [...ids, item._id])}
/>)}
{isLoadingMorePosts && <p role="status">Đang tải...</p>}
{!isLoading && !error && activeSection === "feed" && hasMorePosts && (
  typeof IntersectionObserver === "undefined" ? (
    <button className="create-post-button" type="button" onClick={handleLoadMorePosts} disabled={isLoadingMorePosts}>
      Tải thêm bài viết
    </button>
  ) : (
    <LoadMoreSentinel onVisible={handleLoadMorePosts} disabled={isLoadingMorePosts} />
  )
)}
                  </>
                )}
                </section>
                {activeSection === "feed" && <ContactsPanel friends={friends} sortedContactFriends={sortedContactFriends} onStartConversation={handleStartConversation} />}
            <StoryComposer open={isStoryComposerOpen} file={storyFile} setFile={setStoryFile} submitting={isPostingStory} error={storyFeedback} onClose={() => { setIsStoryComposerOpen(false); setStoryFile(null); setStoryFeedback(""); }} onSubmit={handleCreateStory} />
            {activeStoryGroup && currentStory && <StoryViewer groups={storyGroups} activeGroup={activeStoryGroup} activeIndex={activeStoryIndex} currentUserId={currentUser?._id} error={storyFeedback} onChange={(group, index) => { setActiveStoryGroup(group); setActiveStoryIndex(index); }} onClose={() => setActiveStoryGroup(null)} onDelete={handleDeleteStory} />}
            <ReportDialog
              key={reportTarget?.targetId || "closed"}
              open={Boolean(reportTarget)}
              targetType={reportTarget?.targetType}
              onClose={() => setReportTarget(null)}
              onSubmit={submitReport}
            />
            <Toast message={shareFeedback} onDismiss={() => setShareFeedback("")} />
            <Toast message={storyToast} onDismiss={() => setStoryToast("")} />
        </>
        );
}
export default FeedPage;
