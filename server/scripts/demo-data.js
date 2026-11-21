// Builds the demo data set as plain objects. It does not touch the database, so it can be tested
// without MongoDB. Run server/scripts/seed-demo.js to write it to a database.
//
// Everything is relative to `now`, so run the seed again right before a demo to refresh the dates.

const HOUR_MS = 60 * 60 * 1000;
const DEMO_DOMAIN = "ridge.demo";

const USERS = [
    { username: "demo_admin", joinedDaysAgo: 40, bio: "Quản trị viên Ridge (tài khoản demo).", isAdmin: true },
    { username: "minh_anh", joinedDaysAgo: 27, bio: "Sinh viên công nghệ thông tin, thích cà phê sáng." },
    { username: "hoang_nam", joinedDaysAgo: 27, bio: "Thích lập trình web và chạy bộ." },
    { username: "thu_trang", joinedDaysAgo: 24, bio: "Hay đi cà phê cuối tuần." },
    { username: "quoc_bao", joinedDaysAgo: 20, bio: "Mê sách và nhạc nhẹ." },
    { username: "lan_huong", joinedDaysAgo: 15, bio: "Nấu ăn là niềm vui mỗi ngày." },
    { username: "khanh_vy", joinedDaysAgo: 13, bio: "Chụp ảnh bằng điện thoại." },
    { username: "viet_dung", joinedDaysAgo: 12, bio: "" },
    { username: "duc_thinh", joinedDaysAgo: 11, bio: "Cầu lông mỗi tối." },
    { username: "my_linh", joinedDaysAgo: 9, bio: "Học thiết kế, thích màu pastel." },
    { username: "tuan_kiet", joinedDaysAgo: 9, bio: "" },
    { username: "phuc_hau", joinedDaysAgo: 8, bio: "Đi biển cuối tuần." },
    { username: "gia_han", joinedDaysAgo: 7, bio: "Hay chia sẻ mẹo vặt." },
    { username: "spam_acc99", joinedDaysAgo: 6, bio: "", isLocked: true },
    { username: "bich_ngoc", joinedDaysAgo: 6, bio: "Mới tham gia Ridge." },
    { username: "anh_thu", joinedDaysAgo: 5, bio: "" },
    { username: "bao_chau", joinedDaysAgo: 1.5, bio: "Mới tham gia Ridge." },
];

const FRIEND_PAIRS = [
    ["minh_anh", "hoang_nam"], ["minh_anh", "thu_trang"], ["minh_anh", "quoc_bao"], ["minh_anh", "lan_huong"],
    ["minh_anh", "demo_admin"], ["hoang_nam", "thu_trang"], ["hoang_nam", "duc_thinh"], ["hoang_nam", "my_linh"],
    ["thu_trang", "quoc_bao"], ["quoc_bao", "tuan_kiet"], ["lan_huong", "bich_ngoc"], ["duc_thinh", "my_linh"],
    ["my_linh", "tuan_kiet"], ["bich_ngoc", "gia_han"], ["gia_han", "khanh_vy"], ["khanh_vy", "phuc_hau"],
    ["phuc_hau", "anh_thu"], ["viet_dung", "gia_han"], ["viet_dung", "duc_thinh"],
];

// Authors of general posts. Authors of the reported demo content are left out on purpose, so the
// moderation queue keeps a predictable shape.
const REGULAR_AUTHORS = [
    "minh_anh", "hoang_nam", "thu_trang", "quoc_bao", "lan_huong", "khanh_vy",
    "my_linh", "tuan_kiet", "phuc_hau", "bich_ngoc", "anh_thu",
];

const GENERAL_POSTS = [
    "Sáng nay trời mát quá, đi cà phê một mình mà thấy bình yên lạ.",
    "Vừa xong buổi học lập trình web, cuối cùng cũng hiểu React hook là gì rồi.",
    "Ai biết quán bún riêu nào ngon gần khu mình ở chỉ mình với.",
    "Deadline đồ án đang đến gần, cà phê hôm nay là ly thứ ba rồi.",
    "Cuối tuần này cả nhóm định đi biển, ai muốn tham gia thì nhắn mình nhé.",
    "Mới đọc xong một cuốn sách rất hay về thói quen nhỏ, khuyên mọi người thử.",
    "Mưa chiều nay làm mình nhớ những ngày đi học ngày xưa.",
    "Chia sẻ công thức nước mắm chua ngọt mình vẫn dùng trộn gỏi, đơn giản mà ngon.",
    "Hôm nay mình chạy được 5 km đầu tiên, tuy chậm nhưng vui lắm.",
    "Có ai đang dùng Vite chưa? Tốc độ khởi động nhanh thật sự.",
    "Một ngày làm việc dài, về nhà ăn tô mì nóng là đủ hạnh phúc.",
    "Cảm ơn mọi người đã chúc mừng sinh nhật mình hôm qua, mình rất cảm động.",
    "Tìm bạn cùng chơi cầu lông buổi tối, trình độ vừa phải.",
    "Mình vừa sửa được một lỗi làm mất cả buổi chiều, hóa ra chỉ thiếu một dấu phẩy.",
    "Món cá kho tộ của mẹ vẫn là ngon nhất, không quán nào bì được.",
    "Hoàng hôn trên sông hôm nay đẹp lắm, tiếc là điện thoại không chụp hết được.",
    "Đang học cách viết câu truy vấn MongoDB cho gọn, thấy aggregate khá thú vị.",
    "Nhắc nhẹ: nhớ uống đủ nước, nhất là những ngày nắng nóng thế này.",
    "Tuần này mình thử dậy sớm lúc 5 giờ, ngày dài hơn hẳn.",
    "Ai có kinh nghiệm viết báo cáo đồ án thì cho mình xin vài lời khuyên với.",
    "Vừa mua được cuốn sổ nhỏ để ghi việc cần làm, hy vọng lần này duy trì được.",
    "Đi chợ sáng thấy xoài chín rộ, mua về ăn với muối ớt thì hết ý.",
    "Nhóm mình vừa hoàn thành bản demo đầu tiên, vui như Tết.",
    "Có nên học thêm một ngôn ngữ lập trình mới khi đang làm dở đồ án không nhỉ?",
    "Bài hát hôm nay nghe đi nghe lại mãi mà không chán.",
    "Cuối tháng rồi, lên kế hoạch chi tiêu cho tháng sau thôi nào.",
    "Gửi lời chúc một ngày tốt lành đến tất cả bạn bè trên Ridge.",
    "Trời nắng thế này mà vẫn có người ngồi uống trà đá ngoài vỉa hè, cũng là một cái thú.",
    "Mình đang tập chụp ảnh bằng điện thoại, góc chụp thấp hóa ra đẹp bất ngờ.",
    "Hôm nay đường ít kẹt xe nên mình về sớm hơn dự kiến.",
];

const COMMENT_TEXTS = [
    "Hay quá bạn ơi!", "Mình cũng nghĩ vậy.", "Cảm ơn bạn đã chia sẻ.", "Đồng ý luôn, mình cũng gặp tình huống này.",
    "Chúc bạn thành công nhé!", "Nghe hấp dẫn thật, cho mình tham gia với.", "Bài viết rất hữu ích.", "Haha đúng là như vậy.",
    "Cố lên, sắp xong rồi!", "Mình thử rồi, thấy ổn lắm.", "Có thể nói rõ hơn được không bạn?", "Tuyệt vời!",
    "Nhìn là thấy thích rồi.", "Để cuối tuần mình thử xem sao.", "Ủng hộ bạn hết mình.", "Đọc xong thấy có thêm động lực.",
    "Bạn viết hay quá.", "Chúc mừng bạn nha.",
];

const CHAT_MINH_NAM = [
    ["hoang_nam", "Bạn ơi phần giao diện đăng nhập xong chưa?", 48],
    ["minh_anh", "Xong rồi, mình đang làm phần bảng tin.", 47],
    ["hoang_nam", "Ok, tối nay mình ghép phần tin nhắn vào nhé.", 46.5],
    ["minh_anh", "Được, nhớ test cả trường hợp mất mạng nữa.", 46],
    ["hoang_nam", "Mình vừa thử gửi tin, nhanh hơn trước nhiều.", 30],
    ["minh_anh", "Thật à? Để mình thử bên này.", 29.5],
    ["hoang_nam", "Nhớ mở hai cửa sổ để nhìn thấy hiệu ứng nhé.", 29],
    ["minh_anh", "Thấy rồi, tin nhắn hiện ngay không cần tải lại.", 28],
    ["hoang_nam", "Sắp tới ngày báo cáo rồi, mình chuẩn bị bản demo chưa nhỉ?", 10],
    ["minh_anh", "Đang chuẩn bị, mình sẽ nạp sẵn dữ liệu mẫu.", 9.5],
    ["hoang_nam", "Tốt quá, cảm ơn bạn.", 9],
    ["minh_anh", "Tối nay mình chạy thử lại toàn bộ một lượt nhé.", 3.2],
    ["hoang_nam", "Ok, 8 giờ tối mình online.", 3],
];

const OTHER_CHATS = [
    // [userA, userB, [[sender, text, hoursAgo, isRead], ...]]
    ["minh_anh", "thu_trang", [
        ["thu_trang", "Chào Minh Anh, cuối tuần này đi cà phê không?", 5, true],
        ["minh_anh", "Được chứ, mấy giờ bạn?", 4.8, true],
        ["thu_trang", "9 giờ sáng nhé.", 4.5, true],
        ["thu_trang", "Mình đổi sang 10 giờ được không?", 0.9, false],
        ["thu_trang", "Nếu được thì nhắn mình nhé.", 0.8, false],
    ]],
    ["hoang_nam", "duc_thinh", [
        ["duc_thinh", "Tối nay đánh cầu lông không Nam?", 26, true],
        ["hoang_nam", "Được, 7 giờ ở sân quen nhé.", 25.5, true],
        ["duc_thinh", "Ok, mình đặt sân luôn.", 25, true],
    ]],
    ["thu_trang", "quoc_bao", [
        ["quoc_bao", "Cuốn sách hôm trước bạn đọc xong chưa?", 70, true],
        ["thu_trang", "Xong rồi, mai mình mang trả bạn.", 69, true],
    ]],
    ["lan_huong", "bich_ngoc", [
        ["bich_ngoc", "Chị ơi công thức nước mắm hôm trước chị chia sẻ đâu ạ?", 22, true],
        ["lan_huong", "Chị đăng trên bảng tin rồi nha em.", 21, true],
        ["bich_ngoc", "Em thấy rồi, cảm ơn chị!", 20.5, true],
    ]],
];

// Deterministic pseudo-random numbers: the same data every run (apart from the dates).
function createRandom(seed) {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

function buildDemoData({ now = Date.now(), newId }) {
    const random = createRandom(20261121);
    const pick = (list) => list[Math.floor(random() * list.length)];
    const at = (hoursAgo) => new Date(now - hoursAgo * HOUR_MS);
    const ageHours = (post) => (now - post.createdAt.getTime()) / HOUR_MS;

    // ---- users ----
    const users = USERS.map((spec, index) => {
        const joinedHours = spec.joinedDaysAgo * 24 - ((index * 5) % 7);
        const createdAt = at(joinedHours);
        return {
            _id: newId(),
            username: spec.username,
            email: `${spec.username}@${DEMO_DOMAIN}`,
            bio: spec.bio,
            isAdmin: Boolean(spec.isAdmin),
            isLocked: Boolean(spec.isLocked),
            friend: [],
            joinedHours,
            createdAt,
            updatedAt: createdAt,
        };
    });
    const user = Object.fromEntries(users.map((item) => [item.username, item]));
    const id = (username) => user[username]._id;

    FRIEND_PAIRS.forEach(([a, b]) => {
        user[a].friend.push(user[b]._id);
        user[b].friend.push(user[a]._id);
    });

    // ---- posts ----
    const posts = [];
    const addPost = ({ author, content, hoursAgo, privacy = "public", status = "active", originalPostId = null, likes = [] }) => {
        const createdAt = at(hoursAgo);
        const post = {
            _id: newId(), authorId: id(author), content, privacy, status, originalPostId,
            likes: likes.map(id), createdAt, updatedAt: createdAt,
        };
        posts.push(post);
        return post;
    };

    // Anchor posts used by the live demo and the reported content.
    const a1 = addPost({ author: "minh_anh", hoursAgo: 36, likes: ["hoang_nam", "thu_trang", "quoc_bao"],
        content: "Đang hoàn thiện đồ án mạng xã hội Ridge, còn vài chi tiết nhỏ nữa là xong. Cảm ơn mọi người đã ủng hộ!" });
    const a2 = addPost({ author: "hoang_nam", hoursAgo: 20, likes: ["minh_anh"],
        content: "Vừa thử nhắn tin thời gian thực giữa hai cửa sổ, tin đến ngay lập tức. Rất đáng làm!" });
    const a3 = addPost({ author: "quoc_bao", hoursAgo: 96,
        content: "Ai có sách hay về kỹ năng làm việc nhóm thì giới thiệu mình với nhé." });

    // General posts, more of them recently.
    GENERAL_POSTS.forEach((content, index) => {
        let author = pick(REGULAR_AUTHORS);
        let hoursAgo = 24 * 30 * Math.pow(random(), 1.15) + 1;
        for (let attempt = 0; attempt < 30 && hoursAgo > user[author].joinedHours - 2; attempt += 1) {
            author = pick(REGULAR_AUTHORS);
            hoursAgo = 24 * 30 * Math.pow(random(), 1.15) + 1;
        }
        hoursAgo = Math.min(hoursAgo, user[author].joinedHours - 2);
        const likeCount = Math.floor(random() * 6);
        const likers = [...new Set(Array.from({ length: likeCount }, () => pick(users).username))]
            .filter((name) => name !== author && name !== "spam_acc99");
        addPost({
            author, content, hoursAgo, likes: likers,
            privacy: index % 9 === 4 ? "friends" : "public",
            status: index === 7 ? "deleted" : index === 13 ? "hidden" : "active",
        });
    });
    const generalPosts = posts.filter((post) => post !== a1 && post !== a2 && post !== a3);

    // Three shared posts.
    const shareable = generalPosts.filter((post) => post.status === "active" && post.privacy === "public");
    ["hoang_nam", "thu_trang", "my_linh"].forEach((author, index) => {
        const original = shareable[index * 4];
        // Shared after the original post was written, and after the sharer joined.
        const sharedHoursAgo = Math.max(0.1, Math.min(ageHours(original) * 0.5, user[author].joinedHours - 1));
        addPost({ author, hoursAgo: sharedHoursAgo,
            content: "Hay quá, chia sẻ lại cho mọi người cùng xem.", originalPostId: original._id });
    });

    // Reported content (see docs/DEMO_DATA.md for the story behind each item).
    const v0 = addPost({ author: "viet_dung", hoursAgo: 216,
        content: "Cái đồ ngu như mày thì đừng có đăng bài nữa, nhìn mà phát bực." });
    const v1 = addPost({ author: "viet_dung", hoursAgo: 6,
        content: "Thằng nào còn nói xấu tao nữa là tao đánh gãy chân, cứ chờ đấy." });
    const v2 = addPost({ author: "viet_dung", hoursAgo: 72,
        content: "Kiếm 20 triệu mỗi ngày không cần vốn, nhắn tin ngay để nhận hướng dẫn! bit.ly/kiemtien-nhanh" });
    const m1 = addPost({ author: "gia_han", hoursAgo: 20,
        content: "Uống nước chanh nóng mỗi sáng sẽ chữa khỏi hoàn toàn bệnh tiểu đường, bác sĩ giấu không cho ai biết." });
    const m2 = addPost({ author: "duc_thinh", hoursAgo: 5,
        content: "Hôm nay mà còn trễ deadline nữa chắc mình đập máy tính luôn." });
    const l1 = addPost({ author: "spam_acc99", hoursAgo: 100,
        content: "Mua follow giá rẻ, tăng like nhanh, liên hệ ngay hôm nay!" });

    // ---- comments ----
    const comments = [];
    const addComment = ({ author, post, content, hoursAgo, status = "active" }) => {
        const createdAt = at(hoursAgo);
        const comment = { _id: newId(), authorId: id(author), postId: post._id, content, status, createdAt, updatedAt: createdAt };
        comments.push(comment);
        return comment;
    };

    const cm1 = addComment({ author: "hoang_nam", post: a1, hoursAgo: 34, content: "Bài này hay quá, mình cũng đang định thử." });
    const cm2 = addComment({ author: "thu_trang", post: a1, hoursAgo: 33, content: "Chúc bạn hoàn thành đồ án đúng hạn nhé!" });
    const c1 = addComment({ author: "viet_dung", post: a1, hoursAgo: 32, content: "Viết dở ẹc, đồ ngu như mày thì đừng đăng bài nữa." });
    addComment({ author: "minh_anh", post: a2, hoursAgo: 18, content: "Chuẩn rồi, mình thấy nhanh hơn hẳn." });
    const c2 = addComment({ author: "gia_han", post: a3, hoursAgo: 75, content: "Mua sách giảm 50% ở link này nè bạn ơi, nhắn mình nhé." });
    addComment({ author: "lan_huong", post: a3, hoursAgo: 90, content: "Mình giới thiệu cuốn về làm việc nhóm hôm trước, để mình gửi tên sách." });

    generalPosts.forEach((post) => {
        if (post.status !== "active") return;
        const total = Math.floor(random() * 4);
        for (let i = 0; i < total; i += 1) {
            const author = pick(REGULAR_AUTHORS.concat(["duc_thinh", "gia_han", "viet_dung"]));
            const earliest = Math.max(0.3, ageHours(post) - 1);
            const hoursAgo = Math.max(0.2, earliest * random() * 0.9);
            if (user[author].joinedHours < hoursAgo + 1) continue;
            addComment({ author, post, content: pick(COMMENT_TEXTS), hoursAgo, status: comments.length % 23 === 5 ? "deleted" : "active" });
        }
    });

    // ---- friend requests (pending) ----
    const friendRequests = [];
    const addFriendRequest = (from, to, hoursAgo) => {
        const createdAt = at(hoursAgo);
        const request = { _id: newId(), senderId: id(from), receiverId: id(to), status: "pending", createdAt, updatedAt: createdAt };
        friendRequests.push(request);
        return request;
    };
    const fr1 = addFriendRequest("bao_chau", "minh_anh", 10);
    const fr2 = addFriendRequest("khanh_vy", "minh_anh", 7);
    const fr3 = addFriendRequest("viet_dung", "hoang_nam", 5);

    // ---- reports ----
    const reports = [];
    const addReport = ({ reporter, target, type = "post", reason, description = "", hoursAgo, status = "pending", reviewedHoursAgo = null }) => {
        const createdAt = at(hoursAgo);
        reports.push({
            _id: newId(), reporterId: id(reporter), targetType: type, targetId: target._id, reason, description, status,
            reviewedBy: status === "pending" ? null : id("demo_admin"),
            reviewedAt: status === "pending" ? null : at(reviewedHoursAgo ?? Math.max(0.5, hoursAgo - 6)),
            createdAt, updatedAt: createdAt,
        });
    };

    // High priority: a threat reported by four people, from an author who was already actioned before.
    addReport({ reporter: "thu_trang", target: v1, reason: "violence", description: "Đe dọa đánh người khác.", hoursAgo: 1.2 });
    addReport({ reporter: "quoc_bao", target: v1, reason: "violence", hoursAgo: 2 });
    addReport({ reporter: "my_linh", target: v1, reason: "abuse", hoursAgo: 3 });
    addReport({ reporter: "lan_huong", target: v1, reason: "violence", description: "Bài viết có lời lẽ đe dọa.", hoursAgo: 4 });
    // Earlier case of the same author, already actioned (this feeds the "author reported repeatedly" part).
    addReport({ reporter: "khanh_vy", target: v0, reason: "abuse", hoursAgo: 208, status: "actioned", reviewedHoursAgo: 197 });
    addReport({ reporter: "duc_thinh", target: v0, reason: "abuse", hoursAgo: 204, status: "actioned", reviewedHoursAgo: 197 });
    // Second high: an abusive comment on the presenter's post, same author.
    addReport({ reporter: "thu_trang", target: c1, type: "comment", reason: "abuse", description: "Bình luận xúc phạm.", hoursAgo: 30 });
    addReport({ reporter: "hoang_nam", target: c1, type: "comment", reason: "abuse", hoursAgo: 28 });
    // Medium: a single serious-sounding report (one reporter only), a misinformation post, an old spam post by the repeat author.
    addReport({ reporter: "my_linh", target: m2, reason: "violence", description: "Có vẻ nói đùa nhưng dùng từ bạo lực.", hoursAgo: 2 });
    addReport({ reporter: "bich_ngoc", target: m1, reason: "misinfo", description: "Thông tin y tế sai sự thật.", hoursAgo: 18 });
    addReport({ reporter: "khanh_vy", target: m1, reason: "misinfo", hoursAgo: 19.5 });
    addReport({ reporter: "anh_thu", target: v2, reason: "spam", description: "Quảng cáo kiếm tiền.", hoursAgo: 60 });
    // Low: old single spam reports.
    addReport({ reporter: "khanh_vy", target: c2, type: "comment", reason: "spam", description: "Bình luận quảng cáo, lạc đề.", hoursAgo: 70 });
    addReport({ reporter: "lan_huong", target: l1, reason: "spam", hoursAgo: 96 });

    // Older, already handled reports spread over the last weeks (they fill the "new reports" chart).
    const handledTargets = generalPosts.filter((post) => post.status === "active");
    const reporterNames = ["thu_trang", "quoc_bao", "lan_huong", "khanh_vy", "my_linh", "tuan_kiet", "bich_ngoc", "anh_thu", "hoang_nam"];
    const reasons = ["spam", "abuse", "misinfo", "other", "violence"];
    const handledHours = [26, 50, 75, 100, 130, 160, 190, 240, 280, 330, 380, 430, 480, 540, 600];
    const used = new Set();
    handledHours.forEach((hoursAgo, index) => {
        const target = handledTargets[(index * 2) % handledTargets.length];
        const reporter = reporterNames[index % reporterNames.length];
        const key = `${reporter}:${target._id}`;
        if (used.has(key) || String(target.authorId) === String(id(reporter))) return;
        if (ageHours(target) < hoursAgo) return;
        if (user[reporter].joinedHours < hoursAgo) return;
        used.add(key);
        addReport({
            reporter, target, reason: reasons[index % reasons.length], hoursAgo,
            status: index % 3 === 0 ? "actioned" : "reviewed",
        });
    });

    // ---- conversations and messages ----
    const conversations = [];
    const messages = [];
    const addConversation = (nameA, nameB, script) => {
        const conversation = { _id: newId(), participants: [id(nameA), id(nameB)], lastMessage: null, hiddenFor: [] };
        const made = script.map(([sender, content, hoursAgo, isRead = true]) => {
            const createdAt = at(hoursAgo);
            return { _id: newId(), conversationId: conversation._id, senderId: id(sender), content, isRead, createdAt, updatedAt: createdAt };
        });
        made.sort((x, y) => x.createdAt - y.createdAt);
        conversation.lastMessage = made[made.length - 1]._id;
        conversation.createdAt = made[0].createdAt;
        conversation.updatedAt = made[made.length - 1].createdAt;
        conversations.push(conversation);
        messages.push(...made);
        return { conversation, made };
    };
    addConversation("minh_anh", "hoang_nam", CHAT_MINH_NAM);
    OTHER_CHATS.forEach(([a, b, script]) => addConversation(a, b, script));

    // ---- notifications ----
    const notifications = [];
    const addNotification = ({ to, from, type, hoursAgo, isRead, postId = null, commentId = null, friendRequestId = null, reaction = null }) => {
        const createdAt = at(hoursAgo);
        notifications.push({
            _id: newId(), recipientId: id(to), senderId: id(from), type, postId, commentId, friendRequestId, reaction,
            isRead, createdAt, updatedAt: createdAt,
        });
    };
    addNotification({ to: "minh_anh", from: "bao_chau", type: "friend_request", hoursAgo: 10, isRead: false, friendRequestId: fr1._id });
    addNotification({ to: "minh_anh", from: "khanh_vy", type: "friend_request", hoursAgo: 7, isRead: false, friendRequestId: fr2._id });
    addNotification({ to: "minh_anh", from: "thu_trang", type: "message", hoursAgo: 0.8, isRead: false });
    addNotification({ to: "minh_anh", from: "hoang_nam", type: "like", reaction: "love", hoursAgo: 35, isRead: true, postId: a1._id });
    addNotification({ to: "minh_anh", from: "hoang_nam", type: "comment", hoursAgo: 34, isRead: true, postId: a1._id, commentId: cm1._id });
    addNotification({ to: "minh_anh", from: "thu_trang", type: "comment", hoursAgo: 33, isRead: false, postId: a1._id, commentId: cm2._id });
    addNotification({ to: "minh_anh", from: "viet_dung", type: "comment", hoursAgo: 32, isRead: false, postId: a1._id, commentId: c1._id });
    addNotification({ to: "hoang_nam", from: "viet_dung", type: "friend_request", hoursAgo: 5, isRead: false, friendRequestId: fr3._id });
    addNotification({ to: "hoang_nam", from: "minh_anh", type: "like", reaction: "wow", hoursAgo: 18, isRead: true, postId: a2._id });
    addNotification({ to: "hoang_nam", from: "minh_anh", type: "message", hoursAgo: 3.2, isRead: true });

    // ---- reactions and saved posts ----
    // Added last on purpose: nothing above (reports, scores, charts) changes.
    // `likes` keeps listing everybody who reacted, like the real app does.
    const REACTION_CYCLE = ["like", "like", "love", "like", "haha", "love", "wow", "like", "sad", "angry"];
    let cycle = 0;
    const nextReaction = () => REACTION_CYCLE[cycle++ % REACTION_CYCLE.length];

    posts.forEach((post) => {
        post.reactions = post.likes.map((userId) => ({ userId, reaction: nextReaction() }));
    });
    // The live-demo posts show a mix of kinds.
    a1.reactions = [
        { userId: id("hoang_nam"), reaction: "love" },
        { userId: id("thu_trang"), reaction: "haha" },
        { userId: id("quoc_bao"), reaction: "wow" },
    ];
    a2.reactions = [{ userId: id("minh_anh"), reaction: "wow" }];

    const reactorsFor = (authorId, createdAt, count, offset) => {
        const eligible = users.filter((candidate) =>
            candidate._id !== authorId && !candidate.isLocked && candidate.createdAt <= createdAt);
        const chosen = [];
        for (let k = 0; k < eligible.length && chosen.length < count; k += 1) {
            const candidate = eligible[(offset + k * 3) % eligible.length];
            if (!chosen.includes(candidate)) chosen.push(candidate);
        }
        return chosen;
    };
    comments.forEach((comment, index) => {
        comment.reactions = [];
        if (comment.status !== "active" || index % 2 !== 0) return;
        comment.reactions = reactorsFor(comment.authorId, comment.createdAt, 1 + (index % 3), index)
            .map((candidate) => ({ userId: candidate._id, reaction: nextReaction() }));
    });

    const conversationById = new Map(conversations.map((conversation) => [conversation._id, conversation]));
    messages.forEach((message, index) => {
        message.reactions = [];
        if (index % 4 !== 1) return;
        const other = conversationById.get(message.conversationId).participants.find((userId) => userId !== message.senderId);
        message.reactions = [{ userId: other, reaction: nextReaction() }];
    });

    // The presenter already saved two posts (the "Lưu bài viết" feature exists since the first version).
    user.minh_anh.savedPosts = [a2._id, a3._id];

    return { users, friendRequests, posts, comments, reports, conversations, messages, notifications };
}

module.exports = { buildDemoData, DEMO_DOMAIN, USERS };
