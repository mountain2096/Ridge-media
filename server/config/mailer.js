const nodemailer = require("nodemailer");

let transport;

function credentialsMissingOrPlaceholder() {
    return [process.env.EMAIL_USER, process.env.EMAIL_PASS].some((value) =>
        !value?.trim() || /your_|placeholder|changeme|<.*>/i.test(value));
}

function warnIfUnconfigured() {
    if (credentialsMissingOrPlaceholder()) {
        console.warn("Password reset email is not configured. Set EMAIL_USER and EMAIL_PASS in .env.");
    }
}

async function sendPasswordResetEmail(to, resetURL) {
    transport ??= nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    try {
        const htmlURL = resetURL.replace(/[&"]/g, (character) => character === "&" ? "&amp;" : "&quot;");
        await transport.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject: "Reset your Ridge password",
            text: `Use this link to reset your password: ${resetURL}\nThis link expires in 15 minutes.`,
            html: `<p>We received a request to reset your Ridge password.</p><p><a href="${htmlURL}">Reset your password</a></p><p>This link expires in 15 minutes.</p>`,
        });
    } catch (error) {
        console.error("Password reset email failed:", error.code || "UNKNOWN");
        throw error;
    }
}

module.exports = { sendPasswordResetEmail, warnIfUnconfigured };
