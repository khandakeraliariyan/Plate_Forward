const baseTemplate = require("./base.template");
const escapeHtml = require("../utils/escapeHtml");

module.exports = ({ name }) => {
    return baseTemplate({
        title: "Welcome to PlateForward",
        content: `
<p>Hello <strong>${escapeHtml(name)}</strong>,</p>

<p>
Welcome to PlateForward.
Thank you for helping reduce food waste.
</p>

<div class="success">
Your account has been created successfully.
</div>
`,
    });
};
