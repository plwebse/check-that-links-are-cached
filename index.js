const express = require("express");
const querystring = require("querystring");
const fetch = require('node-fetch');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const app = express();

app.get("/", function (req, res) {
    const error = req.query.error;
    res.send(createHtmlDocument('', ''));
});

app.get("/check/", function (req, res) {

    getContentFromUrl(req.query.url)
        .then((html) => {
            return getHeadersFromUrls(findLinksInHtml(html));
        }).then((json) => {
            res.send(print(json, req.query.url));
        }).catch(err => {
            let errorMsg = querystring.stringify({ "error": err });
            res.redirect(301, '/?' + errorMsg);
        });
});

app.listen(8000);

function print(json, requestedUrl) {

    let tableRows = "";
    json.forEach(element => {
        const url = element.url
        const cacheControl = element.headers["cache-control"] ? JSON.stringify(element.headers["cache-control"]) : "";
        const via = element.headers["via"] ? JSON.stringify(element.headers["via"]) : "";
        const xCache = element.headers["x-cache"] ? JSON.stringify(element.headers["x-cache"]) : "";
        tableRows += `
        <tr>
            <td>${url}</td>
            <td>
            ${cacheControl} <br> 
            ${via} <br> 
            ${xCache}
            </td>
        </tr>
        `
    });

    return html = createHtmlDocument(`<br><table border="1" width="100%">${tableRows}</table>`, requestedUrl);
}

function findLinksInHtml(html) {
    const dom = new JSDOM(html);
    const nodeList = dom.window.document.querySelectorAll("a");
    let list = [];
    nodeList.forEach((nodeItem) => {
        if ((nodeItem.href + "").startsWith("http")) {
            list.push(nodeItem.href);
        }
    });

    return list;
}

function getHeadersFromUrls(urls) {
    let list = [];
    urls.forEach(url => {
        list.push(getHeadersFromUrl(url));
    });

    return Promise.all(list);
}

function getHeadersFromUrl(url) {
    return new Promise((resolve, reject) => {
        fetch(url).then(res => {
            resolve({ url, headers: res.headers.raw() });
        }).catch(err => {
            console.error(err);
            resolve({ url, headers: {} });
        });
    });
}

function getContentFromUrl(url) {
    return new Promise((resolve, reject) => {
        fetch(url).then(res => {
            resolve(res.text());
        }).catch((err) => {
            console.log("getContentFromUrl:" + err);
            resolve("");
        });
    });
}

function createHtmlDocument(bodyHtml, url) {
    const baseHtml = `
<html>
<head>
<title>Check that are links are cached</title>
</head>
<body>

<div style="max-width:1000px; ">
<fieldset>
<legend> Check that are links are cached </legend>
<form action="/check/" method="GET">
    <input type="url" name="url" value="${url}" />
    <input type="submit" value="Check url" />
<form>
</fieldset>

${bodyHtml}

</div>
</body>
</html>
`
    return baseHtml;
}

