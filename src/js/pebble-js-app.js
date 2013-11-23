var http = function(url, cb, fallback) {
	var req = new XMLHttpRequest();
  	req.open('GET', url, true);
  	req.onload = function(e) {
    	if (req.readyState == 4 && req.status == 200)
        	cb(JSON.parse(req.responseText));
    	else {
    		if (fallback)
    			cb(JSON.parse(localStorage.getItem(fallback)));
    	}
  	}
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
	http('http://api.ihackernews.com/page', function(json) {
		if (!json.items)
			console.log(JSON.stringify(json));
		items = json.items;
		localStorage.setItem('items', items);
		items.forEach(function(item, i) {
			send({"index": i, "title": item.title, "points": item.points, "comments": item.commentCount});
		});
	}, 'items');
}

var get = function(i) {
	http('http://clipped.me/algorithm/clippedapi.php?url='+items[i].url, function(json) {
		var summary = json.title + (typeof json.summary !== 'undefined') ? json.summary.join(' ') : '',
			chunks = Math.floor(summary.length/100);
		for(var i=0; i<=chunks; i++) {
			send({"summary": summary.substring(i*100, i*100+100)});
			if (i == chunks)
				send({"summary": "end"});
		}
	});
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
	}
});

Pebble.addEventListener("ready", function (e) {
	setTimeout(fetch, 200)
});