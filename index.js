const express = require("express");
const querystring = require("querystring");
const fetch = require('node-fetch');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const app = express();

const cacheHeaderNames = ["cache-control", "via", "x-cache"];
const tableHeaderColumns = ["url", "msg"];
tableHeaderColumns.push(...cacheHeaderNames);

app.get("/", function (req, res) {
    const error = req.query.error;
    res.send(renderHtmlDocument('', '', error));
});

app.get("/check/", function (req, res) {

    console.log("/check/ " + req.query.url);

    getContentFromUrl(req.query.url)
        .then((html) => { 
            console.log("/check/ reading content from" + req.query.url);           
            return getHeadersFromUrls(findLinksInHtml(html));
        }).then((json) => {   
            console.log("/check/ printing result from" + req.query.url);         
            res.send(printHtml(json, req.query.url));
        }).catch(err => {    
            console.log("/check/ error" + err);        
            console.log(err);
            errorMsg = querystring.stringify({"error": "fel" + err});
            res.redirect(301, '/?' + errorMsg);
        });
});

app.listen(8000);

function printHtml(json, requestedUrl) {

    let tableRows = renderTableRow(tableHeaderColumns, "th");

    json.forEach(element => {
        const values = [element.url, element.msg];
        cacheHeaderNames.forEach(cacheHeaderName => {
            values.push(element.headers[cacheHeaderName] ? JSON.stringify(element.headers[cacheHeaderName]) : "");
        });

        tableRows += renderTableRow(values, "td");
    });

    return renderHtmlDocument(`<br><table border="1" width="100%">${tableRows}</table>`, requestedUrl, "");
}

function findLinksInHtml(html) {
    const dom = new JSDOM(html);
    let nodeList = dom.window.document.querySelectorAll("a");
    let list = [];

    nodeList.forEach(nodeItem => {
        if ((nodeItem.href + "").startsWith("http")) {
            list.push(nodeItem.href);
        }
    });

    return list;
}

function getHeadersFromUrls(urls) {
    return Promise.all(urls.map(url => {
        return getHeadersFromUrl(url)
    }));
}

function getHeadersFromUrl(url) {
    return new Promise((resolve, reject) => {
        fetch(url).then(res => {
            resolve({ url, headers: res.headers.raw(), msg: ''});
        }).catch(err => {
            console.error(err);
            resolve({ url, headers: {}, msg: err });
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

function renderTableRow(values, htmlTag) {
    const str = values.map(value => { return "<" + htmlTag + ">" + value + "</" + htmlTag + ">" }).join("");
    return `<tr>${str}</tr>`
}

function renderHtmlDocument(bodyHtml, url, errorMsg) {
    const baseHtml = `
<html>
<head>
<title>Check that are links are cached</title>
</head>
<body>

<div style="max-width:1000px; ">

${errorMsg}

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

