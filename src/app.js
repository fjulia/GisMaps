import "./stylesheets/main.css";

// Small helpers you might want to keep
import "./helpers/context_menu.js";
import "./helpers/external_links.js";

// ----------------------------------------------------------------------------
// Everything below is just to show you how it works. You can delete all of it.
// ----------------------------------------------------------------------------

import { remote } from "electron";
import jetpack from "fs-jetpack";
var log = require('electron-log');
//import { greet } from "./hello_world/hello_world";
import env from "env";

const app = remote.app;
const appDir = jetpack.cwd(app.getAppPath());
const settings = require('electron-settings');

//var map;

var map;
var trafficLayer;
var directionsService;
var directionsDisplay;
var geocoder;
var geoXml;



function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 41.476, lng: 2.038 },
    zoom: 8
  });

  geoXml = new geoXML3.parser({
    map: map,
    singleInfoWindow: true,
    afterParse: useTheKmlData
  });

  trafficLayer = new google.maps.TrafficLayer();
  directionsService = new google.maps.DirectionsService;
  directionsDisplay = new google.maps.DirectionsRenderer;
  geocoder = new google.maps.Geocoder();

  addKml();
  enableTraffic();
}

function addKml() {
  geoXml.parse('dades_kml/SIG_WAYPOINTS_DARRERES.kml');

}

function useTheKmlData(doc) {
  // Geodata handling goes here, using JSON properties of the doc object

 /* for (var i = 0; i < doc[0].markers.length; i++) {
      // console.log(doc[0].markers[i].title);
      jQuery('#map_text').append(doc[0].markers[i].title + ', ');
  }*/
};


function enableTraffic() {
  trafficLayer.setMap(map);
}

function disableTraffic() {
  trafficLayer.setMap(map);
}


function calculateAndDisplayRoute(directionsService, directionsDisplay) {
  directionsService.route({
    origin: document.getElementById('start').value,
    destination: document.getElementById('end').value,
    travelMode: 'DRIVING'
  }, function (response, status) {
    if (status === 'OK') {
      directionsDisplay.setDirections(response);
    } else {
      window.alert('Directions request failed due to ' + status);
    }
  });
}


/*
Posiciona adreça al mapa*/
function geocodeAddress(address, geocoder, resultsMap) {
  geocoder.geocode({ 'address': address }, function (results, status) {
    if (status === 'OK') {
      resultsMap.setCenter(results[0].geometry.location);
      var marker = new google.maps.Marker({
        map: resultsMap,
        position: results[0].geometry.location
      });
    } else {
      alert('Geocode was not successful for the following reason: ' + status);
    }
  });
}

/*
 Buscar lloc a partir de lat i long
*/
function geocodeLatLng(geocoder, map, infowindow) {
  var input = document.getElementById('latlng').value;
  var latlngStr = input.split(',', 2);
  var latlng = { lat: parseFloat(latlngStr[0]), lng: parseFloat(latlngStr[1]) };
  geocoder.geocode({ 'location': latlng }, function (results, status) {
    if (status === 'OK') {
      if (results[1]) {
        map.setZoom(11);
        var marker = new google.maps.Marker({
          position: latlng,
          map: map
        });
        infowindow.setContent(results[1].formatted_address);
        infowindow.open(map, marker);
      } else {
        window.alert('No results found');
      }
    } else {
      window.alert('Geocoder failed due to: ' + status);
    }
  });
}


if (!settings.has("api.key")) {
  log.error("App has no Settings file or it is incorrect. Api key not found!")
  app.exit(1);
} else {
  var apiKey = settings.get("api.key");
  log.warn("GoogleMaps API key: " + apiKey);
  loadScript('https://maps.googleapis.com/maps/api/js?key=' + apiKey + '&callback=initMap', initMap);
}

function loadScript(url, callback) {
  // Adding the script tag to the head as suggested before
  var head = document.getElementsByTagName('head')[0];
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = url;

  // Then bind the event to the callback function.
  // There are several events for cross browser compatibility.
  script.onreadystatechange = callback;
  script.onload = callback;

  // Fire the loading
  head.appendChild(script);
}

// Holy crap! This is browser window with HTML and stuff, but I can read
// files from disk like it's node.js! Welcome to Electron world :)
/*const manifest = appDir.read("package.json", "json");

const osMap = {
  win32: "Windows",
  darwin: "macOS",
  linux: "Linux"
};

document.querySelector("#app").style.display = "block";
document.querySelector("#greet").innerHTML = greet();
document.querySelector("#os").innerHTML = osMap[process.platform];
document.querySelector("#author").innerHTML = manifest.author;
document.querySelector("#env").innerHTML = env.name;
document.querySelector("#electron-version").innerHTML =
  process.versions.electron;
  */
