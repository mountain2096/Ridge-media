const test = require("node:test");
const assert = require("node:assert/strict");
const nodemailer = require("nodemailer");
const modulePath = require.resolve("../config/mailer");
const originalCreateTransport = nodemailer.createTransport;
let createCount = 0;
let sentMessage;
let sendError;
nodemailer.createTransport = () => {
    createCount += 1;
    return { sendMail: async (message) => { if (sendError) throw sendError; sentMessage = message; } };
};
delete require.cache[modulePath];
const mailer = require("../config/mailer");

test("mailer creates transport on send and sends a reset link as HTML and text", async () => {
    const originalUser = process.env.EMAIL_USER;
    process.env.EMAIL_USER = "ridge@example.com";
    try {
        assert.equal(createCount, 0);
        await mailer.sendPasswordResetEmail("person@example.com", "https://ridge.example/reset-password/token");
        assert.equal(createCount, 1);
        assert.equal(sentMessage.to, "person@example.com");
        assert.match(sentMessage.html, /<a href="https:\/\/ridge\.example\/reset-password\/token">Reset your password<\/a>/);
        assert.match(sentMessage.text, /expires in 15 minutes/);
    } finally {
        if (originalUser === undefined) delete process.env.EMAIL_USER;
        else process.env.EMAIL_USER = originalUser;
        nodemailer.createTransport = originalCreateTransport;
        delete require.cache[modulePath];
    }
});

test("mailer logs only the send error code", async () => {
    const originalError = console.error;
    const logged = [];
    sendError = Object.assign(new Error("private detail"), { code: "EAUTH" });
    console.error = (...args) => logged.push(args);
    try {
        await assert.rejects(mailer.sendPasswordResetEmail("person@example.com", "https://ridge.example/reset"));
        assert.deepEqual(logged, [["Password reset email failed:", "EAUTH"]]);
    } finally {
        sendError = null;
        console.error = originalError;
    }
});

test("mailer warns about missing configuration without printing values", () => {
    const previousUser = process.env.EMAIL_USER;
    const previousPass = process.env.EMAIL_PASS;
    const originalWarn = console.warn;
    const warnings = [];
    delete process.env.EMAIL_USER;
    process.env.EMAIL_PASS = "private-pass-value";
    console.warn = (message) => warnings.push(message);
    try {
        mailer.warnIfUnconfigured();
        assert.equal(warnings.length, 1);
        assert.match(warnings[0], /EMAIL_USER and EMAIL_PASS/);
        assert.doesNotMatch(warnings[0], /private-pass-value/);
    } finally {
        if (previousUser === undefined) delete process.env.EMAIL_USER;
        else process.env.EMAIL_USER = previousUser;
        if (previousPass === undefined) delete process.env.EMAIL_PASS;
        else process.env.EMAIL_PASS = previousPass;
        console.warn = originalWarn;
    }
});
