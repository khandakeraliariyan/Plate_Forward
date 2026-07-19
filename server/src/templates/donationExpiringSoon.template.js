const baseTemplate = require("./base.template");
const escapeHtml = require("../utils/escapeHtml");

module.exports = ({ title, hoursRemaining }) => {
    return baseTemplate({
        title: "Donation Expiring Soon",
        content: `
<p>
Your donation${title ? ` <strong>${escapeHtml(title)}</strong>` : ""}
will expire in approximately ${escapeHtml(String(hoursRemaining))} hour(s)
and hasn't been reserved yet.
</p>

<div class="warning">
Consider lowering the price, extending the pickup window, or promoting it
to nearby NGOs so it doesn't go to waste.
</div>
`,
    });
};
