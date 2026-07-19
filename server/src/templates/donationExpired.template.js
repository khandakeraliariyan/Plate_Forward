const baseTemplate = require("./base.template");

module.exports = () => {
    return baseTemplate({
        title: "Donation Expired",
        content: `
<p>
Unfortunately your donation expired.
</p>

<div class="warning">
You may create another donation.
</div>
`,
    });
};
