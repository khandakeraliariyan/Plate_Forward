const baseTemplate = require("./base.template");
const escapeHtml = require("../utils/escapeHtml");

module.exports = ({ restaurantName }) => {
    return baseTemplate({
        title: "Donation Completed",
        content: `
<p>
The donation process has been completed.
</p>

<p>
Thank you
<strong>
${escapeHtml(restaurantName)}
</strong>
for reducing food waste.
</p>
`,
    });
};
