/* BART API variables */
var bartApiBaseUrl = 'http://api.bart.gov/api';
// This is a demo key use environment if possible
var bartApiKey = process.env.BART_API_KEY || 'MW9S-E7SL-26DU-VV8V';
var bartApiTimeout = 10000;
var stationsInfo = undefined;

var infoCache = {
	stationList: undefined,
	stationInfo: undefined,
	stationAccess: undefined,
	elevatorStatus: undefined,

	getStationList: function() {
		return stationList;
	},

	updateStationList: function(newStationList) {
		stationList = newStationList;
	},

	getStationInfo: function() {
		return stationInfo;
	},

	updateStationInfo: function(newStationInfo) {
		stationInfo = newStationInfo;
	},

	getStationAccess: function() {
		return stationAccess;
	},

	updateStationAccess: function(newStationAccess) {
		stationAccess = newStationAccess;
	},

	getElevatorStatus: function() {
		return elevatorStatus;
	},

	updateElevatorStatus: function(newElevatorStatus) {
		elevatorStatus = newElevatorStatus;
	}
};

function getDistance(latUser, lonUser, latStation, lonStation) {
	var R = 6371;
	var dLat = (latStation - latUser).toRad();
	var dLon = (lonStation - lonUser).toRad();
	var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        	Math.cos(latStation.toRad()) * Math.cos(latUser.toRad()) *
        	Math.sin(dLon / 2) * Math.sin(dLon / 2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	var d = R * c;

	return d * 0.621371;
};

function getStationName(abbr) {
	var stations = infoCache.getStationList().station;
	var n = 0;

	for (n = 0; n < stations.length; n++) {
		if (stations[n].abbr === abbr) {
			return stations[n].name;
		}
	}

	return undefined;
}

function buildHttpRequestOptions(requestUrl) {
	return {
		uri: bartApiBaseUrl + '/' + requestUrl + '&key=' + bartApiKey,
		method: 'GET',
		timeout: bartApiTimeout,
		followRedirect: true,
		maxRedirects: 10
	};
};
