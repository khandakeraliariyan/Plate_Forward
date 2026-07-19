const baseTemplate = require("./base.template");
const escapeHtml = require("../utils/escapeHtml");

module.exports = ({ name, reservationCode, reason }) => {
    return baseTemplate({
        title: "Reservation Cancelled",
        content: `
<p>Hello ${escapeHtml(name)},</p>

<p>
Your reservation${
    reservationCode
        ? ` <strong>${escapeHtml(reservationCode)}</strong>`
        : ""
} has been cancelled.
</p>

${
    reason
        ? `<div class="warning">Reason: ${escapeHtml(reason)}</div>`
        : ""
}
`,
    });
};
