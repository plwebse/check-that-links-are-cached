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
    if (req.query.url) {
        console.log("/ " + req.query.url);

        getContentFromUrl(req.query.url)
            .then((html) => {
                console.log("/ reading content from: " + req.query.url);
                return getHeadersFromUrls(findLinksInHtml(html));
            }).then((json) => {
                console.log("/ printing result from: " + req.query.url);
                res.send(printHtml(json, req.query.url));
            }).catch(err => {
                console.log("/ error: " + err);
                console.log(err);
                res.send(renderHtmlDocument('', req.query.url, err));
            });
    } else {
        console.log("/ ");
        res.send(renderHtmlDocument('', '', ''));
    }
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

    return renderHtmlDocument(`<br><table cellpadding="3" width="100%">${tableRows}</table>`, requestedUrl, "");
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
            resolve({ url, headers: res.headers.raw(), msg: '' });
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
            reject(err);
        });
    });
}

function renderTableRow(values, htmlTag) {
    const str = values.map(value => { return "<" + htmlTag + ">" + value + "</" + htmlTag + ">" }).join("");
    return `<tr>${str}</tr>`
}

function renderHtmlDocument(bodyHtml, url, errorMsg) {

    const errorDiv = (errorMsg) ? "<div><b>" + errorMsg + "</b></div>" : "";
    const bodyHtmlDiv = (bodyHtml) ? "<div>" + bodyHtml + "</div>" : "";

    const baseHtml = `
<html>
<head>
<title>Check that are links are cached</title>
<style>
    fieldset {
        border: 1px solid #ccc;
    }

    fieldset>legend {
        text-transform:uppercase;
        font-weight: bold;
        font-size:20pt;
    } 

    table {
        border: 1px solid #ccc;
        border-collapse: collapse;
        border-radius: 5px;
        width:100%;        
        
    }

    table th, table td {
        border: 1px solid #ccc;
        padding:5px;
        margin:5px;               
    }

    table th {
        background-color: #efefef;        
        text-transform:uppercase;
        text-align: left;

    }    

    input {
        width:100%;
        padding:5px;
        margin:5px;               
    }

    input[type='submit'] {
        text-transform:uppercase;
        font-weight: bold;               
    }

    div#wrapper {
        max-width:1200px;
        margin:auto;
        
    }

    div#wrapper > div {        
        margin:10px 0;
        overflow:hidden;        
        overflow-x:auto;
    }

    div#wrapper > div > b {
        color:#FF0000;
        margin: 20px 10px;
    }        



</style>
</head>
<body>

<div id="wrapper">

    <fieldset>
    <legend> Check that are links are cached </legend>
    <form action="/" method="GET">
        <input type="url" name="url" value="${url}" />
        <input type="submit" value="Check url" />
    <form>
    </fieldset>

    ${errorDiv}

    ${bodyHtmlDiv}

</div>
</body>
</html>
`
    return baseHtml;
}

