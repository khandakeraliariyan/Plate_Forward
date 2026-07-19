const baseTemplate = require("./base.template");
const escapeHtml = require("../utils/escapeHtml");

module.exports = ({ name, verificationUrl }) => {
    return baseTemplate({
        title: "Verify Email",
        content: `
<p>
Hello ${escapeHtml(name)}
</p>

<p>
Click below to verify your email.
</p>
`,
        actionButton: {
            text: "Verify Email",
            url: verificationUrl,
        },
    });
};
