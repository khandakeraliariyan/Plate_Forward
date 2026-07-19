const baseTemplate = require("./base.template");
const escapeHtml = require("../utils/escapeHtml");

module.exports = ({ ngoName }) => {
    return baseTemplate({
        title: "Food Delivered",
        content: `
<p>
Hello ${escapeHtml(ngoName)},
</p>

<p>
Your food has been delivered successfully.
</p>

<div class="success">
Thank you for using PlateForward.
</div>
`,
    });
};
