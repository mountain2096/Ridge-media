const test = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/User");
const mailer = require("../config/mailer");
const { forgotPassword } = require("../controllers/authControllers");

function response() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

test("forgot password has the same response for registered and unknown emails", async () => {
    const originalFindOne = User.findOne;
    const originalSend = mailer.sendPasswordResetEmail;
    const originalClientUrl = process.env.CLIENT_URL;
    const saved = [];
    const sent = [];
    const user = {
        email: "known@example.com",
        save: async function () { saved.push({ token: this.resetPasswordToken, expires: this.resetPasswordExpires }); },
    };
    User.findOne = async ({ email }) => email === user.email ? user : null;
    mailer.sendPasswordResetEmail = async (...args) => { sent.push(args); };
    process.env.CLIENT_URL = "https://ridge.example/";

    try {
        const registered = response();
        await forgotPassword({ body: { email: " KNOWN@example.com " } }, registered);
        const unknown = response();
        await forgotPassword({ body: { email: "unknown@example.com" } }, unknown);

        assert.equal(registered.statusCode, 200);
        assert.deepEqual(registered.body, unknown.body);
        assert.equal(registered.body.message, "Nếu email này đã đăng ký, chúng tôi đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra hộp thư đến và cả mục Thư rác (liên kết hết hạn sau 15 phút).");
        assert.equal(sent.length, 1);
        assert.equal(sent[0][0], user.email);
        assert.match(sent[0][1], /^https:\/\/ridge\.example\/reset-password\/[a-f0-9]{64}$/);
        assert.equal(saved.length, 1);
        assert.notEqual(saved[0].token, sent[0][1].split("/").at(-1));

        mailer.sendPasswordResetEmail = async () => { throw Object.assign(new Error("mail failure"), { code: "EAUTH" }); };
        const mailFailure = response();
        await forgotPassword({ body: { email: user.email } }, mailFailure);
        assert.deepEqual(mailFailure.body, unknown.body);
        assert.equal(user.resetPasswordToken, null);
    } finally {
        User.findOne = originalFindOne;
        mailer.sendPasswordResetEmail = originalSend;
        if (originalClientUrl === undefined) delete process.env.CLIENT_URL;
        else process.env.CLIENT_URL = originalClientUrl;
    }
});
