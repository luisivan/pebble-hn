var CHUNKS_LENGTH = 512
var ASTERIX_PASSWD = "*******"
//176 <- I DON'T KNOW WHAT THAT NUMBER IS YO

var Utils = {
	serialize: function(obj) {
	  	var str = []
	  	for(var p in obj)
	     	str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]))
	  	return '?'+(str.join("&"))
	},
	http: function(url, params, cb, errcb) {
		var req = new XMLHttpRequest()

	  	req.open('GET', url+this.serialize(params), true)
		req.onload = function(e) {
		    if (req.readyState != 4) return
		    if (req.status == 200 || req.status == 201)
		    	cb(req.responseText)
		    else
		    	errcb()
		}
	  	req.send()
	},
	sendQueue: function (queue){
        var index = retries = 0

        var doo = function() {
            if (!queue[index]) return

            console.log('sending '+JSON.stringify(queue[index]))
            Pebble.sendAppMessage(queue[index], success, fail)
        }
        var success = function() {
            console.log('Packet sent')
            index += 1
            retries = 0
            doo()
        }
        var fail = function () {
            retries += 1
            if (retries == 3){
                console.log('Packet fails, moving on')
                index += 1
            }
            doo()
        }
        doo()
	},
	send: function(data) {
		var chunks = Math.ceil(data.length/CHUNKS_LENGTH),
			queue = []
                
        for (var i = 0; i < chunks; i++){
            var payload = {summary:data.substring(CHUNKS_LENGTH*i, CHUNKS_LENGTH*(i+1))}
            if (i == 0) payload.start = "yes"
            if (i == chunks-1) payload.end = "yes"

            queue.push(payload)
        }

        Utils.sendQueue(queue)
	}
}

var HN = {

	items: [],
	sendItems: function(items) {
		var queue = []
		
		items.forEach(function(item, i) {
			queue.push({"index": i, "title": item.title, "points": item.points, "comments": item.commentCount})
		})
		Utils.sendQueue(queue)
	},
	fetch: function() {
		Utils.http('http://api.ihackernews.com/page', null, function(res) {
			HN.items = JSON.parse(res).items
			localStorage.setItem('items', HN.items)
			HN.sendItems(HN.items)
		}, function() {
			HN.sendItems(JSON.parse(localStorage.getItem('items')))
		})
	},
	get: function(i) {
		Utils.http('http://clipped.me/algorithm/clippedapi.php', {url: HN.items[i].url }, function(res) {
			var json = JSON.parse(res),
				summary = json.title + ("summary" in json) ? json.summary.join(' ') : ''

			Utils.send(summary)
		})
	},
	readlater: function(i) {
		var app = ("instapaper" in localStorage) ? "instapaper" : "pocket"
		if (app in localStorage)
			HN[app](HN.items[i].url)
		else
			Pebble.showSimpleNotificationOnPebble("Instapaper", "Login in the configuration screen in the Pebble app.")
	},

	instapaper: function(url) {
		var instapaper = JSON.parse(localStorage.getItem("instapaper"))
		http("https://www.instapaper.com/api/add", {username: instapaper.username, password: instapaper.password, url: url}, function () {
			Pebble.showSimpleNotificationOnPebble("Instapaper", "Article added")
		}, function() {
			Pebble.showSimpleNotificationOnPebble("Instapaper", "Adding failed ("+this.status+")")
		})
	},

	// TODO
	pocket: function(url) {

	}
}

Pebble.addEventListener("appmessage", function(e) {
	var action = Object.keys(e.payload)[0]
	switch (action) {
		case "get":
			HN.get(e.payload[action])
			break
		case "fetch":
			HN.fetch()
			break
		case "readlater":
			HN.readlater(e.payload[action])
			break
	}
})

Pebble.addEventListener("showConfiguration", function (e) {
	var d = {}
	if (localStorage.getItem("instapaper")) {
		d.instapaper = JSON.parse(localStorage.getItem("instapaper"))
		if (d.instapaper.username) d.instapaper.password = ASTERIX_PASSWD
	}

	var u1 = "http://izqui.me/html/hn.html#"+encodeURIComponent(JSON.stringify(d)),
		u2 = "http://izqui.me/html/hn.html#lalala"
	console.log(u1)
	Pebble.openURL(u1)
})

Pebble.addEventListener("webviewclosed", function (e) {
	if (!e.response) return

	var payload = JSON.parse(e.response)
	if ('instapaper' in payload) {
		if (localStorage.getItem("instapaper")) {

			var d = JSON.parse(localStorage.getItem("instapaper"))
			if (payload.instapaper.username == d.username && payload.instapaper.password == ASTERIX_PASSWD)
				console.log('Didnt change yo')
			else {

				//Check auth
				http("https://www.instapaper.com/api/authenticate", payload.instapaper, function () {
					Pebble.showSimpleNotificationOnPebble("Instapaper", "Your Instapaper account is set up. \nLong click on an article to read it later.")
					localStorage.setItem("instapaper", JSON.stringify(payload.instapaper))
				}, function() {
					Pebble.showSimpleNotificationOnPebble("Instapaper", "Your Instapaper credentials are not valid, re-enter them please.")
					localStorage.removeItem("instapaper")
				})
			}
		}
	}
})

Pebble.addEventListener("ready", function () {
	setTimeout(HN.fetch, 200)
})