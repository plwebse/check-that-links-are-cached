const express = require("express");
const querystring = require("querystring");
const fetch = require('node-fetch');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;


const app = express()
app.get("/", function (req, res) {
    const error = req.query.error
    const html = `
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
    }).catch(err => {
        console.log(err);
        let errorMsg = querystring.stringify({"error": err});
        res.redirect(301, '/?' + errorMsg);
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
            <table border="1">
                ${tableRows}
            </table>
        </html>
    `
    return html;
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
            }).catch(err => {                
                reject(Error(err));
            });
        });
}



