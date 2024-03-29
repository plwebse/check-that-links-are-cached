require('log-timestamp');
const express = require("express");
const fetch = require('node-fetch');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const app = express();

const cacheHeaderNames = ["cache-control", "via", "x-cache"];
const tableHeaderColumns = ["url", "msg"];
tableHeaderColumns.push(...cacheHeaderNames);

app.get("/", function (req, res) {
    console.log("app get / start");
    if (req.query.url) {
        console.log("/ " + req.query.url);

        getContentFromUrl(req.query.url)
            .then((html) => {
                console.log("/ reading content from: " + req.query.url);
                return getHeadersFromUrls(findLinksInHtml(html));
            }).then((json) => {
                console.log("/ printing result from: " + req.query.url);
                res.status(200).send(printHtml(json, req.query.url));
            }).catch(err => {
                console.log("/ error: " + err);
                res.status(500).send(renderHtmlDocument('', req.query.url, err));
            });
    } else {
        console.log("/ ");
        res.status(200).send(renderHtmlDocument());
    }
    console.log("app get / end");
});

console.log("starting app ");
app.listen(8000);
console.log("listning on 8000");

function getContentFromUrl(url) {
    return new Promise((resolve, reject) => {
        fetch(url).then(res => {
            resolve(res.text());
        }).catch((err) => {
            reject(err);
        });
    });
}

function findLinksInHtml(html) {
    const dom = new JSDOM(html);
    const nodeList = Array.from(dom.window.document.querySelectorAll("a"));

    return nodeList
        .map(nodeItem => nodeItem.href)
        .filter(href => href.startsWith("http"));
}

function getHeadersFromUrls(urls) {
    return Promise.all(urls.map(url => getHeadersFromUrl(url)));
}

function getHeadersFromUrl(url) {
    return new Promise((resolve) => {
        fetch(url).then(res => {
            resolve({ url, headers: res.headers.raw(), msg: '' });
        }).catch(err => {
            console.error(err);
            resolve({ url, headers: {}, msg: err });
        });
    });
}

function printHtml(json, requestedUrl) {

    let tableRows = renderTableRow(tableHeaderColumns, "th");

    json.forEach(element => {
        const values = [element.url, element.msg];

        cacheHeaderNames.forEach(cacheHeaderName => {
            values.push(element.headers[cacheHeaderName] ? JSON.stringify(element.headers[cacheHeaderName]) : "");
        });

        tableRows += renderTableRow(values, "td");
    });

    return renderHtmlDocument(tableRows, requestedUrl);
}

function renderTableRow(values, htmlTag) {
    const str = values.map(value => "<" + htmlTag + ">" + value + "</" + htmlTag + ">").join("");
    return `<tr>${str}</tr>`
}

function renderHtmlDocument(bodyHtml, url, errorMsg) {
    const urlValue = (url) ? url : '';
    const errorDiv = (errorMsg) ? "<div><b>" + errorMsg + "</b></div>" : "";
    const bodyHtmlDiv = (bodyHtml) ? `<div><table cellpadding="3" width="100%">${bodyHtml}</table> </div>` : "";
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

        table tr:nth-child(odd) {
            background-color: #efefef;  
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
        <input type="url" name="url" value="${urlValue}" />
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

