const express = require("express");
const fetch = require('node-fetch');
//const { response } = require("express");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const app = express()
app.get("/", function (req, res) {
    let html = `
        <html>
            <head></head>
            <body>
                <form action="/check/" method="GET">
                    <input type="url" name="url" />
                    <input type="submit" value="Check url" />
                <form>
            </body>
        </html>
    `
    res.send(html);
});

app.get("/check/", function (req, res) {

    Promise.all([getContentFromUrl(req.query.url)]).then((out) => {
        let list = [];
        for (url of findLinksInHtml(out[0])) {
            list.push(getHeadersFromUrl(url));
        }

        Promise.all(list).then((out) => {
            res.send(print(out))
        })
    });

    return;
});

app.listen(3001);

function print(json){
    
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

    let html = `
        <html>
            <head></head>
            <body>
                <form action="/check/" method="GET">
                    <input type="url" name="url" />
                    <input type="submit" value="Check url" />
                <form>
            </body>
            <table>
                ${tableRows}
            </table>
        </html>
    `
    return html;
}

function findLinksInHtml(html) {
    dom = new JSDOM(html);
    const nodeList = dom.window.document.querySelectorAll("a");
    let list = [];
    nodeList.forEach(function (nodeItem) {
        if ((nodeItem.href + "").startsWith("http")) {
            list.push(nodeItem.href);
            console.log(nodeItem.href);
        }
    });

    return list;
}

function getHeadersFromUrl(url) {
    return new Promise(function (resolve, reject) {
        fetch(url).then(res1 => {
            console.log(res1.headers.raw());
            resolve({ url: url, headers: res1.headers.raw() });
        }).catch(err => {
            console.error(err);
            resolve({ url: url, headers: {}});

        });
    });
}

function getContentFromUrl(url) {
    return new Promise(function (resolve, reject) {
        fetch(url).then(res1 => {
            resolve(res1.text());
        }).catch(err => {
            console.error(err);
            reject(Error("It broke"));
        });
    });
}



