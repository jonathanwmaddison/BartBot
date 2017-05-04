var BART = (function BARTModule(){


/* BART API variables */
var bartApiBaseUrl = 'http://api.bart.gov/api';
// This is a demo key use environment if possible
var bartApiKey = process.env.BART_API_KEY || 'MW9S-E7SL-26DU-VV8V';
var apiContext = '/api';
var bartApiTimeout = 10000;
var stationsInfo = undefined;
var httpRequest = require('request')
var xmlParser = require('xml2js')

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

function buildHttpRequestOptions(requestUrl) {
	return {
		uri: bartApiBaseUrl + '/' + requestUrl + '&key=' + bartApiKey,
		method: 'GET',
		timeout: bartApiTimeout,
		followRedirect: true,
		maxRedirects: 10
	};
};

function getServiceAnnouncements( cb ){
  httpRequest(
    buildHttpRequestOptions('bsa.aspx?cmd=bsa&date=today'),
    function(error, resp, body) {
      // TODO non happy path
      var xmlServiceAnnouncements = xmlParser.parseString(body, { trim: true, explicitArray: false }, function(err, res) {
        if (err){
          return cb(err)
        }
        var newArray = [];

        // Fix single bsa to be an array
        if (! Array.isArray(res.root.bsa)) {
          newArray.push(res.root.bsa);
          res.root.bsa = newArray;
        }

        res.root.bsa = res.root.bsa.reverse();

        return cb(null, res.root)
      });
    }
  );
}

return {
  getServiceAnnouncements: getServiceAnnouncements
}

})()
module.exports = BART
