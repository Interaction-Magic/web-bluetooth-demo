# Web Bluetooth test

This is a simple, MLP (minimum lovable product) setup for getting a Bluetooth LE device to talk to a webpage.

## Setup

There are two parts:

1. [Adafruit ItsyBitsy nRF52840 Express](https://www.adafruit.com/product/4481).
   
	This [board is very cool](https://learn.adafruit.com/adafruit-itsybitsy-nrf52840-express), with really neat features like a level-shifted GPIO output for neopixel control, Vhigh output pin for high voltage output, native USB, easy battery powering via the [backpack add-on](https://www.adafruit.com/product/2124) etc...

2. Webpage demo running in Chrome / Edge

To get this demo running:

1. Clone this repo

2. Upload the PlatformIO project to the ItsyBitsy

3. Connect a potentiometer to pin A0 on the ItsyBitsy

3. Open the `web-demo/index.html` file in Chrome or Edge and connect!

## Javascript library

This demo uses the handy `BTConnector` JS library I wrote. You can download it from [this Github repo](https://github.com/Interaction-Magic/ux-proto-tools) or hotlink directly (not recommended):

`<script src="https://lib.interactionmagic.com/src/BTConnector.js"></script>`

## Useful Background

Bluetooth LE is part of Bluetooth 4.0.

A Bluetooth LE device uses GATT to advetise a number of `services`. This demo advertises a `battery service` and a `UART` service, which is a neat little UART-like comms interface that Nordic include on their BLE stack. Each service then has one or more `characteristics` which are data endpoints you can read from/to. The battery service has one called `battery_level`, and the UART service has a `TX` and `RX` service. For web demos, once the UART service is up and running we don't need anything else, we can just write our own protocol to send/receive bytes of data on this.

Each service and characteristic has a UUID. These can be short, generic 16-bit ones (e.g. the battery one) or long, custom 128-bit ones (e.g. the custom UART interface). In the Javascript code you can see the UUIDs saved for the Nordic service/characteristics.

Data messages are sent as a string of bytes. The C++ and Javascript demo code shows examples of how to send and read messages at both ends. 

The BLE device advertises its service more frequently at power on, waiting for something to connect to. This frequency is based on the recommended [Apple guidelines](https://developer.apple.com/library/content/qa/qa1931/_index.html).

The Arduino demo also shows how to rename the device that is advertised to a custom name (this name is then shown when connecting in Chrome/Edge). The JS code shows how to filter to only show BLE devices in range with that name.

## Further reading

+ Check and debug Bluetooth connections in Google Chrome:
  [chrome://bluetooth-internals/](chrome://bluetooth-internals/)

+ Good basic theory on GATT, services and characteristics:
  https://devzone.nordicsemi.com/nordic/short-range-guides/b/bluetooth-low-energy/posts/ble-services-a-beginners-tutorial

+ Some JS examples (don't run on page, but can copy code):
  https://googlechrome.github.io/samples/web-bluetooth/index.html

+ Also a good overview of BLE
  https://www.arduino.cc/en/Reference/ArduinoBLE 
