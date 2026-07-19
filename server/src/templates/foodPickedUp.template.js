const baseTemplate = require("./base.template");
const escapeHtml = require("../utils/escapeHtml");

module.exports = ({ volunteerName }) => {
    return baseTemplate({
        title: "Food Picked Up",
        content: `
<p>
${escapeHtml(volunteerName)}
has picked up your food.
</p>

<div class="success">
The delivery is now in progress.
</div>
`,
    });
};
