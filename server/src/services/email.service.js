const transporter = require("../config/email");

const sendEmail = async ({
    to,
    subject,
    text,
    html,
    cc,
    bcc,
    attachments = [],
    replyTo,
}) => {
    const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_EMAIL}>`,
        to,
        subject,
        text,
        html,
        cc,
        bcc,
        replyTo,
        attachments,
    };

    return await transporter.sendMail(mailOptions);
};

const sendBulkEmail = async ({
    recipients,
    subject,
    text,
    html,
}) => {
    const results = [];

    for (const recipient of recipients) {
        try {
            const info = await sendEmail({
                to: recipient,
                subject,
                text,
                html,
            });

            results.push({
                email: recipient,
                success: true,
                messageId: info.messageId,
            });
        } catch (error) {
            results.push({
                email: recipient,
                success: false,
                error: error.message,
            });
        }
    }

    return results;
};

const sendTemplateEmail = async ({
    to,
    subject,
    template,
    data,
}) => {
    const html = template(data);

    return await sendEmail({
        to,
        subject,
        html,
    });
};

module.exports = {
    sendEmail,
    sendBulkEmail,
    sendTemplateEmail,
};