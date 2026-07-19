const juice = require("juice").default;

const baseTemplate = ({
    title,
    content,
    actionButton,
}) => {
    const html = `
<!DOCTYPE html>
<html>

<head>
<meta charset="UTF-8" />

<style>

body{
margin:0;
padding:0;
background:#f4f4f4;
font-family:Arial,Helvetica,sans-serif;
}

.wrapper{
max-width:650px;
margin:40px auto;
background:#ffffff;
border-radius:12px;
overflow:hidden;
box-shadow:0 5px 20px rgba(0,0,0,.08);
}

.header{
background:#16a34a;
padding:30px;
text-align:center;
}

.header h1{
margin:0;
color:#fff;
font-size:28px;
}

.body{
padding:40px;
color:#333;
font-size:16px;
line-height:1.7;
}

.button{
display:inline-block;
padding:14px 28px;
background:#16a34a;
color:#ffffff !important;
text-decoration:none;
border-radius:8px;
font-weight:bold;
margin-top:20px;
}

.footer{
padding:20px;
background:#fafafa;
text-align:center;
font-size:13px;
color:#777;
}

.warning{
background:#FEF3C7;
padding:15px;
border-radius:8px;
margin-top:20px;
}

.success{
background:#DCFCE7;
padding:15px;
border-radius:8px;
margin-top:20px;
}

</style>

</head>

<body>

<div class="wrapper">

<div class="header">
<h1>PlateForward</h1>
</div>

<div class="body">

<h2>${title}</h2>

${content}

${
actionButton
? `<a class="button" href="${actionButton.url}">
${actionButton.text}
</a>`
: ""
}

</div>

<div class="footer">

© ${new Date().getFullYear()} PlateForward

<br>

Reducing Food Waste. Feeding Communities.

</div>

</div>

</body>

</html>
`;

    return juice(html);
};

module.exports = baseTemplate;
