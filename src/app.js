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
//import { send_message } from "./telegram/telegram_helper";
import env from "env";

const app = remote.app;
const appDir = jetpack.cwd(app.getAppPath());
const settings = require('electron-settings');

var kmlfile = settings.get("kml.path");
log.warn("Loading kmlFile from: " + kmlfile);
//var map;

var map;
var trafficLayer;
var directionsService;
var directionsDisplay;
var geocoder;
var geoXml;
var marker;
var infowindow;
var printKml = false;
var trafficEnabled = false;
var gpsEnabled = false;

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 41.476, lng: 2.038 },
    zoom: 8,
    mapTypeControl: true,
    streetViewControl: true,
    rotateControl: true,
    fullscreenControl: false
  });

  google.maps.event.addListener(map, "rightclick", function (event) {
    if (marker) marker.setMap(null);
    var lat = event.latLng.lat();
    var lng = event.latLng.lng();
    var title = "Lat: " + lat + " " + "Lng: " + lng;
    marker = createMarker(map, { lat: lat, lng: lng }, title);
  });

  google.maps.event.addListener(map, "zoom_changed", function (event) {
    /*if (map.getZoom() > 13) {
      this.printKml = true;
      doPrintKml();
    } else {
      this.printKml = false;
      clearKml();
    }*/
  });

  infowindow = new google.maps.InfoWindow({ minWidth: 250, maxWidth: 300 });


  trafficLayer = new google.maps.TrafficLayer();
  directionsService = new google.maps.DirectionsService;
  directionsDisplay = new google.maps.DirectionsRenderer;
  geocoder = new google.maps.Geocoder();

  startKml();
  initButtons();
}
function initButtons() {
  var traffic_btn = document.querySelector("#traffic_btn");
  traffic_btn.addEventListener("click", function (event) {
    event.preventDefault();
    trafficEnabled = !trafficEnabled;
    if (trafficEnabled) {
      enableTraffic();
      traffic_btn.className = "active";
    } else {
      disableTraffic();
      traffic_btn.classList.remove("active");
    }
  });

  var gps_btn = document.querySelector("#gps_btn");
  gps_btn.addEventListener("click", function (event) {
    event.preventDefault();
    gpsEnabled = !gpsEnabled;
    if (gpsEnabled) {
      gps_btn.className = "active";
      dpPrintKml();
    } else {
      gps_btn.classList.remove("active");
      clearKml();
    }
  });
}


function startKml() {
  var self = this;
  if (gpsEnabled) {
    dpPrintKml();
  } else {
    clearKml();
  }
  setTimeout(function () {
    startKml()
  }, 60000);
}

function dpPrintKml() {
  if(geoXml)geoXml.hideDocument();
  geoXml = new geoXML3.parser({
    map: map,
    infowindow: infowindow,
    zoom:false,
    singleInfoWindow: true
    /* createMarker: function (placemark, doc) {
       //get the marker from the built-in createMarker-function
       var marker=geoXML3.instances[0].createMarker(placemark, doc);
       //modify the content
       if(marker.infoWindow){
         marker.infoWindowOptions.content=
         '<div class="geoxml3_infowindow"><h3>' + placemark.name +
         '</h3><div>' + placemark.description + '</div>'+
         '<code onclick="map.setCenter(new google.maps.LatLng'+
           marker.getPosition().toString()+
         ');map.setZoom(map.getZoom()+1);">zoom in</code><br/>'+
         '<code onclick="map.setCenter(new google.maps.LatLng'+
           marker.getPosition().toString()+
         ');map.setZoom(map.getZoom()-1);">zoom out</code>'+
         '</div>';
       }
     return marker;
   }*/
  });
    geoXml.parse(kmlfile);
}

function clearKml() {
  if(geoXml)geoXml.hideDocument();
}

//placing a marker on the map
function createMarker(map, coords, title) {
  var marker = new google.maps.Marker({
    position: coords,
    map: map,
    label: 'A',
    title: title,
    draggable: false
  });
  marker.addListener('click', function () {
    showMarkerInfo();
  });
  return marker;
}

function showMarkerInfo() {

}



function enableTraffic() {
  trafficLayer.setMap(map);
}

function disableTraffic() {
  trafficLayer.setMap(null);
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

/*
BOOTSTRAP
Load maps api js and launch init()
*/

if (!settings.has("api.key")) {
  log.error("App has no Settings file or it is incorrect. Api key not found!")
  app.exit(1);
} else {
  var apiKey = settings.get("api.key");
  log.warn("GoogleMaps API key: " + apiKey);
  try {
    loadScript('https://maps.googleapis.com/maps/api/js?key=' + apiKey + '&callback=initMap', initMap);
  } catch (err) {
    //catch initmap callback error
  }
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

