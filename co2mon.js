'use strict';
const CO2Monitor = require('node-co2-monitor');
const GoogleSpreadsheet = require('google-spreadsheet');
const dateFormat = require('dateformat')
const creds = require('./client-secret.json');

// Create a document object using the ID of the spreadsheet - obtained from its URL.
const doc = new GoogleSpreadsheet('1m8TtBkWqfTNO-KGh5K5nJvlE-aLnMsr9zDPGMbAMvMY');

const monitor = new CO2Monitor();

const DATA_SUBMISSION_INTERVAL_MS = 10000

var googleDocConnected = false
var monitorConnected = false

// Authenticate with the Google Spreadsheets API.
doc.useServiceAccountAuth(creds, function (err) {

  if (err) {
    console.log(err)
    return;
  }

  console.log('Google Docs Connected')

  googleDocConnected = true

  checkAndStartSendingData()
});

// Connect device.
monitor.connect((err) => {
    if (err) {
        return console.error(err.stack);
    }

    monitorConnected = true

    console.log('Monitor connected.');

    // Read data from CO2 monitor.
    monitor.transfer();

    checkAndStartSendingData()
});

var lastCO2
var lastTemp

// Get results.
monitor.on('temp', (temperature) => {
  lastTemp = temperature
});

monitor.on('co2', (co2) => {
  lastCO2 = co2
});

// Error handler
monitor.on('error', (err) => {
    monitorConnected = false
    console.error(err.stack);
    // Disconnect device
    monitor.disconnect(() => {
        console.log('Monitor disconnected.');
        process.exit(0);
    });
});

function checkAndStartSendingData() {
  if (!googleDocConnected) {
    console.log('Waiting for Google Doc connection...')
  }

  if (!monitorConnected) {
    console.log('Waiting for CO2 Monitor Connection...')
  }

  if (googleDocConnected && monitorConnected) {
    setInterval(sendData, DATA_SUBMISSION_INTERVAL_MS)
  }
}

function sendData() {
  if (!monitorConnected) {
    console.log('[ERROR] CO2 monitor is not connected')
    return
  }

  if (!googleDocConnected) {
    console.log('[ERROR] Google Docs not connected')
    return
  }

  if (!lastCO2 || !lastTemp) {
    return
  }

  // Writing data
  var now = new Date()
  var timeString = dateFormat(now, 'mm/dd/yyyy HH:MM:ss')

  doc.addRow(1, {
    'Time': timeString,
    'CO2' : lastCO2,
    'Temp': lastTemp
  }, function (err) {
    if (err) {
      console.log(err)
    } else {
      lastCO2  = null
      lastTemp = null
    }
  })
}
