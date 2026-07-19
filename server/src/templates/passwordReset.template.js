const baseTemplate = require("./base.template");
const escapeHtml = require("../utils/escapeHtml");

module.exports = ({ name, resetUrl }) => {
    return baseTemplate({
        title: "Password Reset",
        content: `
<p>
Hello ${escapeHtml(name)}
</p>

<p>
You requested a password reset.
</p>

<div class="warning">
If you didn't request this,
ignore this email.
</div>
`,
        actionButton: {
            text: "Reset Password",
            url: resetUrl,
        },
    });
};
