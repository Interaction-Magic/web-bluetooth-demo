#include <Arduino.h>
#include <bluefruit.h>

// BLE Services we will advertise
BLEUart bleuart; // UART over BLUE
BLEBas  blebas;  // Battery level

// Pot angle
const uint8_t angle_pin = A0;
const uint32_t angle_check_interval = 50;
uint32_t last_angle_check = 0;
bool angle_is_sending = true;


char send_buffer[32];

void setup(){

	Serial.begin(115200);
	delay(1500);
	Serial.println("Starting!");

	Bluefruit.autoConnLed(true);  // Set BLE LED to be enabled on CONNECT
	Bluefruit.configPrphBandwidth(BANDWIDTH_MAX); // Config the peripheral connection with max bandwidth 

	// Setup and begin connection
	Bluefruit.begin();
	Bluefruit.setTxPower(4);    // Check bluefruit.h for supported values

	// Set the name the device will be advertised as
	// For some reason, we need to call getName() afterwards to force the name to set
	Bluefruit.setName("Interaction Magic 001");
	char fetchedName[64];
 	Bluefruit.getName(fetchedName, 64);

	// Configure and Start BLE Uart Service
	bleuart.begin();

	// Start BLE Battery Service
	blebas.begin();
	blebas.write(90); // TODO: Advertise the actual battery level :)

	// Set up and start advertising
	Bluefruit.Advertising.addFlags(BLE_GAP_ADV_FLAGS_LE_ONLY_GENERAL_DISC_MODE);
	Bluefruit.Advertising.addTxPower();

	// Include bleuart 128-bit uuid
	Bluefruit.Advertising.addService(bleuart);

  	Bluefruit.ScanResponse.addName();
	
	// Start Advertising with following parameters based on Apple recommended intervals:
	//  https://developer.apple.com/library/content/qa/qa1931/_index.html  
	// 
	//  - Enable auto advertising if disconnected
	//  - Interval:  fast mode = 20 ms, slow mode = 152.5 ms
	//  - Timeout for fast mode is 30 seconds
	//  - Start(timeout) with timeout = 0 will advertise forever (until connected)
	//  
	Bluefruit.Advertising.restartOnDisconnect(true);
	Bluefruit.Advertising.setInterval(32, 244);    // in unit of 0.625 ms ?!
	Bluefruit.Advertising.setFastTimeout(30);      // number of seconds in fast mode
	Bluefruit.Advertising.start(0);                // 0 = Don't stop advertising after n seconds  
}

void loop(){
	// Forward data from HW Serial to BLEUART
/*	while (Serial.available()){
		// Delay to wait for enough input, since we have a limited transmission buffer
		delay(2);

		uint8_t buf[64];
		int count = Serial.readBytes(buf, sizeof(buf));
		bleuart.write( buf, count );
	}*/


	// Read angle ever x second
	if(angle_is_sending){
		if(millis() - last_angle_check > angle_check_interval){

			// Load the angle into the send buffer
			// Send value should be in format a192, a8, a243 etc...
			memset(send_buffer, 0, sizeof send_buffer);
			send_buffer[0] = 'a';
			itoa(analogRead(angle_pin),&send_buffer[1],10);
			bleuart.write(send_buffer, strlen(send_buffer)); // no strlen()+1 needed as we just send the bytes here :)

			// Update timing check
			last_angle_check = millis();
		}
	}


	// Forward from BLEUART to HW Serial
	while(bleuart.available()){
		byte ch;
		ch = (byte) bleuart.read();
		switch(ch){
			case 'a':
				angle_is_sending = !angle_is_sending;
				bleuart.write("Angle send toggled!");
				break;
			case 'b':
				blebas.write(75);
				break;
		}
	}
}