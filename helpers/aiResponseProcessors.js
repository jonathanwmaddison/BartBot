const BART = require('../BART/BART');
const request = require('request');

const aiResponseProcessors = {}

aiResponseProcessors.getServiceAnnouncements = function (res) {
  BART.getServiceAnnouncements( function callback(err, json){
    if(err){
      return res.status(400).json({
                status: {
                    code: 400,
                    errorType: 'I failed to find any announcements.'
                }
            })
    } else {
      let msg = "Current BART Announcements at " + json.time + " on " + json.date + ": "+json.bsa.map((announcement) => "/n station: " + announcement.station + " type: " + announcement.type + " description: " + announcement.description);
      return res.json({
        speech: msg,
        displayText: msg,
        source: 'announcements'
      })
    }
  })
}
aiResponseProcessors.getWeather = function(res, req) {
	let city = req.body.result.parameters['geo-city-us'];
	let apikey = process.env.WEATHER_API;
	let units = "imperial"
	let resturl = 'http://api.openweathermap.org/data/2.5/weather?APPID='+apikey+'&q='+city+'&units='+units;
	request.get(resturl, (err, response, body) => {
		if(!err && response.statusCode === 200) {
			let json = JSON.parse(body);
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

aiResponseProcessors.getClosestStation = function(res, location) {
	if(location === '') {
		return res.json({
			speech: 'LOCATION',
			source: 'station',
		});
	}
	let searchLocation = encodeURI(location + ", CA");
  	let resturl = 'http://maps.google.com/maps/api/geocode/json?address='+searchLocation;
	request.get(resturl, (err, response, body) => {
		if(!err && response.statusCode === 200) {
			let json = JSON.parse(body);
			let lat = json.results[0].geometry.location.lat;
			let lng = json.results[0].geometry.location.lng;
			BART.stationByLocation(lat, lng, function callback(err, json){
        		if(err){
      				return res.status(400).json({
      					status: {
      						code: 400,
      						errorType: 'I failed to find a station.'
      		  			}
          			})
        		} else {
          			let msg = "The closest station is " + json.name + " on " + json.address + " in "+json.city+". It is "+Math.ceil(json.distance)+" miles away";
          			return res.json({
            			speech: msg,
            			displayText: msg,
            			source: 'station'
          			})
        		}
	    	});
    	}
  	});
}

aiResponseProcessors.getAllStations = function (res) {
  BART.getStations( function callback(err, json){
    if (err) console.log(err)
    else{
      let msg = "Bart stations:  " + json.map ((station) => " "+ station.abbr);
		return res.json({
        	speech: msg,
        	displayText: msg,
        	source: 'allstations'
      })
    }
  })
}

aiResponseProcessors.getConnectionData = function(res, abbr) {
  BART.getConnectionData(abbr, function callback(err, json){
    if (err){
			return res.status(400).json({
				status: {
					code: 400,
					errorType: 'I failed to find any connection.'
				}
			})
		} else {
      let msg = "The next train from " + json.origin +" to "+ json.destination + " is at "+ json.schedule.request.trip.details.origTimeMin;
			return res.json({
				speech: msg,
				displayText: msg,
				source: 'fromto'
			})

    }
  })
}

module.exports = aiResponseProcessors;
