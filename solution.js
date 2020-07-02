// Web Scraping using NodeJS
// by Ilma Alifia Mahardika

const rp = require('request-promise');
const cheerio = require('cheerio');
const { Promise } = require('bluebird');
fs = require('fs');
const baseUrl = 'https://www.bankmega.com/'
const url = baseUrl + 'promolainnya.php'
var solution = {}
var categoryLinks = []

rp({
    uri: url,
    transform: function (body) {
        return cheerio.load(body)
    },
    headers: {
        Connection: 'keep-alive',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36'
    }
})
.then(function ($) {
    // Get category link
    let regex = /\$\("#(.+?)"\)\.click(?:.|\n)+?\.load\("ajax.promolainnya.php(.+?)"/g, match;
    while (match = regex.exec($('#contentpromolain2').find('script').html())) {
        categoryLinks.push({
            'category': match[1],
            'url': url + match[2]
        })
    }
    return categoryLinks
})
.then(function(categoryLinks){
    const promise1 = categoryLinks.map((elem, i) => rp({
        uri: elem.url,
        transform: function(body){
            return cheerio.load(body)
        },
        headers: {
            Connection: 'keep-alive',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36'
        }})
        .then(function($){
            // Get total page
            var category = elem.category
            var cnt = -2
            $('.tablepaging').find('td').each(function(i, elem){
                cnt += 1
            })

            solution[category] = []

            // Get link in each page
            var itemLinks = []
            for (var i = 1; i <= cnt; i++){
                var promise2 = rp({
                    uri: elem.url + '&page=' + i,
                    transform: function (body) {
                        return cheerio.load(body)
                    }
                })
                .then(function ($) {
                    if (category == 'others') {
                        var altText = $('#contentpromolain2').find('img').attr('title')
                    }

                    $('#contentpromolain2').find('li').each(function(i, elem) {
                        var link = $(this).find('a').attr('href')
                        var itemLink = (link).startsWith('http') ? link : baseUrl + link;
                        itemLinks.push(itemLink)
                    })

                    // Get detailed item
                    const promise3 = itemLinks.map((elem, i) => rp({
                        uri: elem,
                        transform: function (body) {
                            return cheerio.load(body)
                        },
                        headers: {
                            Connection: 'keep-alive',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36'
                        }
                    })
                    .then(function ($) {
                        if (category == 'others') {
                            var images = []
                            $('#konten').find('img').each(function(i, elem) {
                                images.push(baseUrl + $(this).attr('src'))
                            })
                            solution[category].push({
                                'title': altText,
                                'image': images
                            })
                        } else {
                            solution[category].push({
                                'title': $('#contentpromolain2').find('.titleinside').text().trim(),
                                'image': baseUrl + $('#contentpromolain2').find('img').attr('src'),
                                'area': $('#contentpromolain2').find('.area').find('b').text().trim(),
                                'period': $('#contentpromolain2').find('.periode').find('b').text().trim()
                            })
                        }
                    })
                    .catch(function (err) {
                        console.log('GET DETAILED ITEM ERROR: ', err)
                    }))
                    return Promise.all(promise3)
                })
                .catch(function (err) {
                    console.log('GET LINK IN EACH PAGE ERROR: ', err)
                })
            }
            return Promise.all(promise2)
        })
        .catch(function (err) {
            console.log('GET TOTAL PAGE ERROR: ', err)
        }))
    return Promise.all(promise1)
})
.then (function(){
    fs.writeFile('solution.json', JSON.stringify(solution), function (err) {
        if (err) return console.log('WRITE TO JSON ERROR: ', err);
    });
})
.catch(function (err) {
    console.log('GET CATEGORY LINK ERROR: ', err)
});