var CHUNKS_LENGTH = 100;
var localStorage = window.localStorage;
var ASTERIX_PASSWD = "*******"

var serialize = function(obj) {
  var str = [];
  for(var p in obj)
     str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
  return str.join("&");
}

var http = function(url, params, json, cb, fallback) {
	var req = new XMLHttpRequest();

	var q = '?'+serialize(params)

  	req.open('GET', url+q, true);

  	if (json){
	  	req.onload = function(e) {

	    	if (req.readyState == 4){
	    		if (req.status == 200){
	        		cb(JSON.parse(req.responseText));
	    		}
		    	else {

		    		if (fallback && localStorage.getItem(fallback)){
		    			cb(JSON.parse(localStorage.getItem(fallback)));
		    		}
		    		
		    	}
	    	}

	  	}
  	}
  	else req.onload = cb;

  	req.send(null);
}

var jobs = 0;
var send = function(data) {
	console.log("sending data");
	setTimeout(function() {
		Pebble.sendAppMessage(data);
		jobs--;
	}, jobs++*100);
}

var items;

var fetch = function() {
	console.log("fetching");
	http('http://api.ihackernews.com/page', {}, true,  function(json) {
		if (!json.items)
			console.log(JSON.stringify(json));
		items = json.items;
		localStorage.setItem('items', items);
		items.forEach(function(item, i) {
			send({"index": i, "title": item.title, "points": item.points, "comments": item.commentCount});
		});
	}, "items");
}

var get = function(i) {
	http('http://clipped.me/algorithm/clippedapi.php', {url:items[i].url}, true, function(json) {
		var summary = json.title + (typeof json.summary !== 'undefined') ? json.summary.join(' ') : '',
			chunks = Math.floor(summary.length/CHUNKS_LENGTH);

		for(var i=0; i<=chunks; i++) {
			send({"summary": summary.substring(i*CHUNKS_LENGTH, (i+1)*CHUNKS_LENGTH)});
			if (i == chunks)
				send({"summary": "end"});
		}
	});
}

var readlater = function(i) {

		
	var instapaper = JSON.parse(localStorage.getItem("instapaper")),
		url = items[i].url

	if (instapaper && instapaper.username){

		http("https://www.instapaper.com/api/add",{username:instapaper.username, password:instapaper.password, url:url}, false, function (d){

			if (this.readyState==4){

				if (this.status == 201 || this.status == 200){

					Pebble.showSimpleNotificationOnPebble("Instapaper", "Article added")
				}
				else {

					Pebble.showSimpleNotificationOnPebble("Instapaper", "Adding failed ("+this.status+")")
				}
			}
		})
	}
	else {

		Pebble.showSimpleNotificationOnPebble("Instapaper", "Login in the configuration screen in the Pebble app.")
	}
}
Pebble.addEventListener("appmessage", function(e) {
	var action = Object.keys(e.payload)[0];
	switch (action) {
		case "get":
			get(e.payload[action]);
			break;
		case "fetch":
			fetch();
			break;
		case "readlater":
			readlater(e.payload[action]);
			break;
	}
});
Pebble.addEventListener("showConfiguration", function (e){

	var d = {}
	if (localStorage.getItem("instapaper")){

		d.instapaper = JSON.parse(localStorage.getItem("instapaper"))
		if (d.instapaper.username) d.instapaper.password = ASTERIX_PASSWD
	}

	var u1 = "http://izqui.me/html/hn.html#"+encodeURIComponent(JSON.stringify(d))
	var u2 = "http://izqui.me/html/hn.html#lalala"
	console.log(u1)
	Pebble.openURL(u1)
})
Pebble.addEventListener("webviewclosed", function (e){

	if (e.response){

		var payload = JSON.parse(e.response)
		if (payload['instapaper']){

			if (localStorage.getItem("instapaper")){

				var d = JSON.parse(localStorage.getItem("instapaper"))
				if (payload.instapaper.username == d.username && payload.instapaper.password == ASTERIX_PASSWD){

					console.log('Didnt change yo')
				}
				else {

					//Check auth
					http("https://www.instapaper.com/api/authenticate", payload.instapaper, false, function (e){

						if (this.readyState==4){

							if (this.status == 201 || this.status == 200){

								Pebble.showSimpleNotificationOnPebble("Instapaper", "Your Instapaper account is set up. \nLong click on an article to read it later.")
								localStorage.setItem("instapaper", JSON.stringify(payload.instapaper))
							}
							else {

								Pebble.showSimpleNotificationOnPebble("Instapaper", "Your Instapaper credentials are not valid, re-enter them please.")
								localStorage.setItem("instapaper", "")
							}	
						}
					})
				}
			}
		}
	}
})
Pebble.addEventListener("ready", function (e) {
	setTimeout(fetch, 200)
	
});