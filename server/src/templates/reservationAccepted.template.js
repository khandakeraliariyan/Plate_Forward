const baseTemplate = require("./base.template");
const escapeHtml = require("../utils/escapeHtml");

module.exports = ({ ngoName, restaurantName }) => {
    return baseTemplate({
        title: "Reservation Accepted",
        content: `
<p>Hello ${escapeHtml(ngoName)},</p>

<p>
<strong>${escapeHtml(restaurantName)}</strong>
accepted your reservation.
</p>

<div class="success">
Please wait for a volunteer assignment.
</div>
`,
    });
};
