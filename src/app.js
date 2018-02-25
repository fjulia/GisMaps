import "./stylesheets/main.css";

// Small helpers you might want to keep
import "./helpers/context_menu.js";
import "./helpers/external_links.js";
// ----------------------------------------------------------------------------
// Everything below is just to show you how it works. You can delete all of it.
// ----------------------------------------------------------------------------

import { remote } from "electron";
var dialog = remote.dialog;
import jetpack from "fs-jetpack";
const TelegramBot = require('node-telegram-bot-api');
var log = require('electron-log');
const notifier = require('node-notifier');

import { sendTelegramMessage, sendTelegramLocation, loadGroupId } from "./telegram/telegram_helper";


// replace the value below with the Telegram token you receive from @BotFather



import env from "env";

const app = remote.app;
const appDir = jetpack.cwd(app.getAppPath());
var settings = jetpack.read('./Settings.js', 'json');

var kmlfile = settings.kml.path;
log.warn("Loading kmlFile from: " + kmlfile);

var token = settings.telegram.botToken;
var groupId = settings.telegram.groupId;
var groupName = settings.telegram.groupName;

document.querySelector("#token").value = token
document.querySelector("#groupName").value = groupName;
document.querySelector("#groupId").value = groupId;
// Create a bot
const bot = new TelegramBot(token, { polling: false });
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
var autocomplete;
var marker;

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
  directionsDisplay.setMap(map);
  geocoder = new google.maps.Geocoder();

  marker = new google.maps.Marker({
    map: map,
    label: 'A',
    draggable: false
  });

  marker.addListener('click', function () {
    showMarkerInfo(false);
  });

  marker.addListener('rightclick', function () {
    showMarkerInfo(false);
  });

  autocomplete = new google.maps.places.Autocomplete(
    (document.getElementById('autocomplete')),
    { componentRestrictions: { country: 'es' } });
  autocomplete.bindTo('bounds', map);
  autocomplete.addListener('place_changed', selectedAddress);

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

  var settings_btn = document.querySelector("#settings_btn");
  settings_btn.addEventListener("click", function (event) {
    event.preventDefault();
    document.querySelector("#config_win").style.display = "block";
  });

  var close_config_btn = document.querySelector("#close_config_btn");
  close_config_btn.addEventListener("click", function (event) {
    event.preventDefault();
    document.querySelector("#config_win").style.display = "none";
  });

  var configBnt = document.querySelector("#configBnt");
  configBnt.addEventListener("click", function (event) {
    event.preventDefault();
    updateTokenConfig();
  });

  var testBnt = document.querySelector("#testBnt");
  testBnt.addEventListener("click", function (event) {
    event.preventDefault();
    testTelegram();
  });
}

function updateTokenConfig() {
  token = document.querySelector("#token").value;
  settings.telegram.botToken = token;
  groupName = document.querySelector("#groupName").value;
  settings.telegram.groupName = groupName;
  groupId = document.querySelector("#groupId").value;
  if (groupId.length == 0) {
    loadGroupId(bot, groupName).then((groupId) => {
      settings.telegram.groupId = groupId;
      document.querySelector("#groupId").value = groupId;
      jetpack.write('./Settings.js', settings);
    });
  } else {
    settings.telegram.groupId = groupId;
  }
  jetpack.write('./Settings.js', settings);
}

function testTelegram() {
  sendTelegramMessage(bot, groupId, "Hola!!!").then(() => {
    dialog.showMessageBox({ type: "info", message: "Missatge enviat comprova el telegram!" });
  }).error((err) => {
    doalog.showErrorBox("Test Fallat", "Assegure't de configurar primer el telegram");
  })
}

function selectedAddress() {
  var place = autocomplete.getPlace();
  if (!place.geometry) {
    // User entered the name of a Place that was not suggested and
    // pressed the Enter key, or the Place Details request failed.
    window.alert("No details available   for input: '" + place.name + "'");
    return;
  }

  // If the place has a geometry, then present it on a map.
  if (place.geometry.viewport) {
    map.fitBounds(place.geometry.viewport);
  } else {
    map.setCenter(place.geometry.location);
    map.setZoom(17);  // Why 17? Because it looks good.
  }
  /*marker.setIcon(({
    url: place.icon,
    size: new google.maps.Size(71, 71),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(17, 34),
    scaledSize: new google.maps.Size(35, 35)
  }));*/
  marker.setPosition(place.geometry.location);
  marker.setVisible(true);

  var dst = {};
  dst.lat = place.geometry.location.lat();
  dst.lng = place.geometry.location.lng();
  calculateAndDisplayRoute(directionsService, directionsDisplay, settings.origin, dst);

  //Send telegram location
  sendLocation(bot, groupId, dst.lat, dst.lng, place.name);
}

function sendLocation(bot, groupId, lat, lng, name) {
  sendTelegramLocation(bot, groupId, lat, lng).then(() => {
    notifier.notify('Notificacio enviada!');
    console.log("Sent location success!");
  }).error((err) => {
    dialog.showErrorBox("Error Telegram", "No s'ha pogut enviar el missatge al telegram");
  })
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
  var infowindow = new google.maps.InfoWindow({ minWidth: 250, maxWidth: 300 });
  if (geoXml) geoXml.hideDocument();
  geoXml = new geoXML3.parser({
    map: map,
    infowindow: infowindow,
    zoom: false,
    singleInfoWindow: 1,
    /* createMarker: function (placemark, doc) {
       //get the marker from the built-in createMarker-function
       var marker = geoXML3.instances[0].createMarker(placemark, doc);
       //modify the content
       if (marker.infoWindow) {
         marker.infoWindowOptions.content =
           '<div class="geoxml3_infowindow"><h3>' + placemark.name +
           '</h3><div>' + placemark.description + '</div>' +
           '<code onclick="map.setCenter(new google.maps.LatLng' +
           marker.getPosition().toString() +
           ');map.setZoom(map.getZoom()+1);">zoom in</code><br/>' +
           '<code onclick="map.setCenter(new google.maps.LatLng' +
           marker.getPosition().toString() +
           ');map.setZoom(map.getZoom()-1);">zoom out</code>' +
           '</div>';
       }
       return marker;
     }*/
  });
  geoXml.parse(kmlfile);
}

function clearKml() {
  if (geoXml) geoXml.hideDocument();
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
    showMarkerInfo(true, coords);
  });
  marker.addListener('rightclick', function () {
    showMarkerInfo(true, coords);
  });
  return marker;
}

function showMarkerInfo(route, position) {
  var contentString;
  if (route) {
    contentString = "<div id='telegram_btn'><button onclick='telegramFromMarker(" + position.lat + "," + position.lng + ")'>Telegram</button></div><div id='route_btn'><button onclick='routeFromMarker(" + position.lat + "," + position.lng + ")'>Ruta</button></div>";
  } else {
    contentString = "<div><button onclick='telegramFromMarker(" + position.lat + "," + position.lng + ")'>Telegram</button></div>";
  }
  var infowindow = new google.maps.InfoWindow({
    content: contentString
  });
  infowindow.open(map, marker);
}

window.telegramFromMarker = function (lat, lng) {
  sendLocation(bot, groupId, lat, lng, "");
}

window.routeFromMarker = function (lat, lng) {
  var dst = {};
  dst.lat = lat;
  dst.lng = lng;
  calculateAndDisplayRoute(directionsService, directionsDisplay, settings.origin, dst);
}


function enableTraffic() {
  trafficLayer.setMap(map);
}

function disableTraffic() {
  trafficLayer.setMap(null);
}


function calculateAndDisplayRoute(directionsService, directionsDisplay, origin, dest) {
  directionsService.route({
    origin: origin,
    destination: dest,
    travelMode: 'DRIVING'
  }, function (response, status) {
    if (status === 'OK') {
      directionsDisplay.setDirections(response);
    } else {
      window.alert('Directions request failed due to ' + status);
    }
  });
}


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



if (!jetpack.exists("./Settings.js")) {
  alert("App has no Settings file or it is incorrect. Api key not found!");
  app.exit(1);
} else {
  var apiKey = settings.api.key;
  log.warn("GoogleMaps API key: " + apiKey);
  try {
    loadScript('https://maps.googleapis.com/maps/api/js?key=' + apiKey + '&libraries=places', initMap);
  } catch (err) {
    console.log(err);
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

