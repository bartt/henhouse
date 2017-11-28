#! /usr/bin/env node

var debug = require('debug')('door');
var gpio = require('rpi-gpio');
var StateMachine = require('javascript-state-machine');

var MAX_CLOSING_TIME = 1 * 1000; // 1 seconds
var MAX_OPENING_TIME = 1 * 1000; // 20 seconds
var STOP_DELAY = 500; // .5 seconds
var fsm = StateMachine.create({
    initial: 'Unknown',
    error: function(eventName, from, to, args, errorCode, errorMessage) {
       debug("event '" + eventName + "' was naughty: " + errorMessage);
    },        
    events: [
        { name: 'close', from: 'Unknown', to: 'UnknownClosing' },
        { name: 'atBottom',  from: 'UnknownClosing',  to: 'Closed' },
        { name: 'leavingTop',  from: 'UnknownClosing',  to: 'Opening' },
        { name: 'timedOut',  from: 'UnknownClosing',  to: 'UnknownOpening' },
        { name: 'atTop', from: 'UnknownOpening', to: 'Open' },
        { name: 'timedOut', from: 'UnknownOpening', to: 'ErrorOpening' },
        { name: 'leavingBottom', from: 'UnknownOpening', to: 'Closing' },
        { name: 'close',  from: 'Open', to: 'Closing' },
        { name: 'open', from: 'Closed', to: 'Opening' },
        { name: 'timedOut', from: 'Closing', to: 'ErrorClosing' },        
        { name: 'timedOut', from: 'Opening', to: 'ErrorOpening' },       
        { name: 'atTop', from: 'Opening', to: 'Open' },       
        { name: 'atBottom', from: 'Closing', to: 'Closed' },       
    ],
    callbacks: {
        onenterstate: function(event, from, to) {
            debug('Moving from ' + from + ' to ' + to + ' triggered by event ' + event);
        },
        onUnknownClosing: function(event, from, to) {
            lowerDoor();
            setTimeout(function() {
               fsm.timedOut();
            }, MAX_CLOSING_TIME);
        },
        onUnknownOpening: function(event, from, to) {
            raiseDoor();
            setTimeout(function() {
               fsm.timedOut();
            }, MAX_OPENING_TIME);
        }, 
        onErrorClosing: function(event, from, to) {
            stopDoor();
            debug('Alert Bart via DM and/or Growl');
        },
        onErrorOpening: function(event, from, to) {
            stopDoor();
            debug('Alert Bart via DM and/or Growl');
        },
        onClosing: function(event, from, to) {
            lowerDoor();
            setTimeout(function() {
               fsm.timedOut();
            }, MAX_CLOSING_TIME);
        },
        onOpening: function(event, from, to) {
            raiseDoor();
            setTimeout(function() {
               fsm.timedOut();
            }, MAX_OPENING_TIME);
        },
        onClosed: function(event, from, to) {
            setTimeout(stopDoor, STOP_DELAY);
        },
        onOpen: function(event, from, to) {
            stopDoor;
        }
    }
});

// All pin numbers in gpio.MODE_RPI aka as laid out on the board.
gpio.setMode(gpio.MODE_RPI);
var bottomSensor = 13;
var topSensor = 15;
var motorUp = 37;
var motorDown = 38;
var delay = 750; // miliseconds

function sensorCallback(channel, value) {
    var sensorName = channel === bottomSensor ? 'bottom' : 'top';
    debug('Channel ' + channel + ' (' + sensorName + ') value is now ' + value);
    switch (channel) {
    case topSensor:
        if (!value) {
            // Reached top
            fsm.atTop();
            // Stop and set state to Open.
            lowerDoor();
        } else {
            // Leaving top
            fsm.leavingTop();
            raiseDoor();
        }
        setTimeout(checkMaxTravelTime, delay);
        break;
    case bottomSensor:
        if (!value) {
            // Reached bottom
            fsm.atBottom();
            // Continue for X more seconds, then stop
            // Set state to Closed
            raiseDoor();
        } else {
            // Leaving bottom
            fsm.leavingBottom();
            lowerDoor();
        }
        setTimeout(checkMaxTravelTime, delay);
        break;
    default: 
        debug('Unknown sensor reading, shutting down.');
        shutdown();
    }
}

function raiseDoor() {
    debug('Raising door');
    gpio.write(motorDown, false, logError);
    gpio.write(motorUp, true, logError);
    // Set state to Opening
}

function lowerDoor() {
    debug('Lowering door');
    gpio.write(motorUp, false, logError);
    gpio.write(motorDown, true, logError);
    // Set state to Closing
}

function stopDoor() {
    debug('Stopping door');
    gpio.write(motorDown, false, logError);
    gpio.write(motorUp, false, logError);
}

function checkMaxTravelTime() {
    // Check state
    // When Opening or Closing then
    stopDoor();
    // Set state to ErrorOpening or ErrorClosing
    // send Alert
}

function logError(err) {
    if (err) {
        debug('Error writing to GPIO pin: ' + err);
    }
}

function shutdown() {
    stopDoor();
    closePins();
}

function closePins() {
    gpio.destroy(function() {
        debug('All pins unexported');
    });
}

process.on( 'SIGINT', function() {
    debug( "\nGracefully shutting down from SIGINT (Ctrl-C)" );
    shutdown();
})

gpio.setup(motorDown, gpio.DIR_OUT);
gpio.setup(motorUp, gpio.DIR_OUT);

gpio.on('change', sensorCallback);

gpio.setup(bottomSensor, gpio.DIR_IN, gpio.EDGE_BOTH);
gpio.setup(topSensor, gpio.DIR_IN, gpio.EDGE_BOTH);
debug('Listening on top and bottom sensors');

setTimeout(function() {
    debug('Figuring out initial state');
    fsm.close();
}, 1000);
