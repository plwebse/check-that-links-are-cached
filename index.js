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
            console.log(out);
            res.json(out);
        })
    });

    return;
});

app.listen(3001)

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



