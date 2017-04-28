/*
	Resources that were used to build this prototype

		https://api.ai/		
			~ Helps take user input and categorize it. Also provides access to conversational UI AI
		http://bart.crudworks.org/api/		
			~ This API is a simpler more user friendly interface for Bart.
		http://www.girliemac.com/blog/2017/01/06/facebook-apiai-bot-nodejs/  
			~ this is a helpful tutorial
		ngrok: 
			~ this provides https/SSL, a requirement of Facebook messenger	

	Other Notes
	
		https://github.com/simonprickett/bartfbchatbot -> Simon also built a chatbot which could be useful to follow along with. Current Implementation makes use of his API which could be modified and improved on.

*/

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const request = require('request');
const apiai = require('apiai');
const apiaiApp = apiai(process.env.AI_TOKEN);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Webhook to connect bot to messenger
app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] && req.query['hub.verify_token'] === 'tuxedo_cat') {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.status(403).end();
  }
});

app.post('/webhook', (req, res) => {
    if(req.body.object === 'page') {
        req.body.entry.forEach((entry) => {
            entry.messaging.forEach((event) => {
                if (event.message && event.message.text) {
                    sendMessage(event);
                }
            });
        });
        res.status(200).end();
    }
});

app.post('/ai', (req, res) => {
	if (req.body.result.action === 'weather') {
		getWeather(res, req)
	} else if (req.body.result.action === 'announcements') {
		getServiceAnnouncements(res)
	} else if (req.body.result.action === 'station') {
		getClosestStation(res, req.body.result.parameters.streetaddress)
	} else if (req.body.result.action === 'allstations') {
		getAllStations(res)
	} else if (req.body.result.action === 'fromto') {
		getConnectionData(res, {start: req.body.result.parameters.abbr, destination: req.body.result.parameters.abbr1})
	}
})

function sendMessage(event) {
	let sender = event.sender.id;
	let text = event.message.text;
	
	//set set up of api.ai
	let apiai = apiaiApp.textRequest(text, {
		sessionId: 'tuxedo_cat'
	});
	apiai.on('response', (response) => {
	let aiText = response.result.fulfillment.speech;
	request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: process.env.FACEBOOK_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: sender},
            message: {text: aiText}
        }
    }, function (error, response) {
        if(error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    	});
	});
	apiai.on('error', (error) => {
		console.log(error)
	});
	apiai.end();
}

function getWeather(res, req) {
	let city = req.body.result.parameters['geo-city-us'];
	let apikey = process.env.WEATHER_API_KEY;
	let units = "imperial"
	let resturl = 'http://api.openweathermap.org/data/2.5/weather?APPID='+apikey+'&q='+city+'&units='+units;
	request.get(resturl, (err, response, body) => {
		if(!err && response.statusCode === 200) {
			let json = JSON.parse(body);
			console.log(json)
			let msg = "The current condition in " + city  + " is " + json.weather[0].description + ' and the temperature is ' + json.main.temp + ' ℉';
			return res.json({
				speech: msg,
				displayText: msg,
				source: 'weather'
			});
		} else {
			return res.status(400).json({
				status: {
					code: 400,
					errorType: 'I failed to look up the city name.'
				}
			})
		}
	})
}
function getServiceAnnouncements(res) {
	let resturl = 'http://bart.crudworks.org/api/serviceAnnouncements'
	request.get(resturl, (err, response, body) => {
		if(!err && response.statusCode === 200) {
			let json = JSON.parse(body);
			let msg = "Current BART Announcements at " + json.time + " on " + json.date + ": "+json.bsa.map((announcement) => "/n station: " + announcement.station + " type: " + announcement.type + " description: " + announcement.description);
			return res.json({
				speech: msg,
				displayText: msg,
				source: 'announcements'
			})
		} else {
			return res.status(400).json({
				status: {
					code: 400,
					errorType: 'I failed to find any announcements.'
				}
			})
		}
	})	
}
function getLatLong(location, callback, res) {
	let resturl = 'http://maps.google.com/maps/api/geocode/json?address='
	let searchLocation = encodeURI(location + ", CA");
	resturl+=searchLocation;
	request.get(resturl, (err, response, body) => {
		if(!err && response.statusCode === 200) {
			let json = JSON.parse(body);
			let lat = json.results[0].geometry.location.lat;
			let lng = json.results[0].geometry.location.lng;
			callback(lat, lng, res)
			return
		} else {
			return res.status(400).json({
				status: {
					code: 400,
					errorType: 'I failed to find a station.'
				}
			})
		}
	});
}
function fetchStation(lat, lng, res) {
	let resturl = 'http://bart.crudworks.org/api/station/'+lat+'/'+lng;
	request.get(resturl, (err, response, body) => {
		if(!err && response.statusCode === 200) {
			let json = JSON.parse(body);
			let msg = "The closest station is " + json.name + " on " + json.address + " in "+json.city+". It is "+Math.ceil(json.distance)+" miles away";
			return res.json({
				speech: msg,
				displayText: msg,
				source: 'station'
			})
		} else {
			return res.status(400).json({
				status: {
					code: 400,
					errorType: 'I failed to find a station.'
				}
			})
		}
	})
}
function getClosestStation(res, location) {
	getLatLong(location, fetchStation, res)	

}
function getAllStations (res) {
	let resturl = 'http://bart.crudworks.org/api/stations'
	request.get(resturl, (err, response, body) => {
		if(!err && response.statusCode === 200) {
			let json = JSON.parse(body);
			let msg = "Bart stations:  " + json.map ((station) => " "+ station.abbr);
			return res.json({
				speech: msg,
				displayText: msg,
				source: 'allstations'
			})
		} else {
			return res.status(400).json({
				status: {
					code: 400,
					errorType: 'I failed to find any announcements.'
				}
			})
		}
	})	
}
function getConnectionData(res, abbr) {

	//TODO allow more flexibility in system. Currently only takes station abbreviations.	
	let resturl = 'http://bart.crudworks.org/api/tickets/'+abbr.start+'/'+abbr.destination;
	request.get(resturl, (err, response, body) => {
		if(!err && response.statusCode === 200) {
			console.log(body)
			let json = JSON.parse(body);
			let msg = "The next train from " + json.origin +" to "+ json.destination + " is at "+ json.schedule.request.trip.details.origTimeMin; 
			return res.json({
				speech: msg,
				displayText: msg,
				source: 'fromto'
			})
		} else {
			return res.status(400).json({
				status: {
					code: 400,
					errorType: 'I failed to find any connection.'
				}
			})
		}
	})	

}
//SERVER
const server = app.listen(process.env.PORT || 5000, () => {
    console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});
