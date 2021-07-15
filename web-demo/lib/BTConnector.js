
class BTConnector{

	// UUIDs for the services on nRF5x
	// NUS = Nordic UART Service
	// https://devzone.nordicsemi.com/f/nordic-q-a/10567/what-is-nus-nordic-uart-service
	ble_NUS_Service_UUID  = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
	ble_NUS_CharRX_UUID   = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
	ble_NUS_CharTX_UUID   = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

	// Message send chunk size
	msg_send_chunk_size = 20;
	
	// Variables to handle services, servers etc...
	bleDevice;
	bleServer;
	rxCharacteristic;
	txCharacteristic;
	batteryCharacteristic;
	
	// Options object for this connection
	_options = {
		namePrefix: "Interaction Magic",
		onBatteryChange: (event) => { console.log(`Battery: ${event.target.value.getUint8(0)}%`); },
		onReceive: (msg) => { console.log(`Received: ${msg}`); },
		onDisconnect: () => {},
		onStatusChange: (msg) => { console.log(msg); }
	};

	// Constructor, to merge in the options
	constructor(options){
		this._options = {...this._options, ...options};
	}

	connect = async () => {

		// Check if BT is possible in this browser
		if (!navigator.bluetooth) {
			console.log(`WebBluetooth API is not available.\r\nPlease make sure the Web Bluetooth flag is enabled.`);
			return;
		}
		this._options.onStatusChange('Requesting Bluetooth Device...');

		try{

			this.bleDevice = await navigator.bluetooth.requestDevice({
				filters: [{
					namePrefix: [this._options.namePrefix]
				}],
				optionalServices: [this.ble_NUS_Service_UUID, 'battery_service'],
				// acceptAllDevices: true // <-- Uncomment this to view all BT devices
			});

			this._statusChange('Found ' + this.bleDevice.name);
			this._statusChange('Connecting to GATT Server...');

			this.bleDevice.addEventListener('gattserverdisconnected', this._options.onDisconnect);
			this.bleServer = await this.bleDevice.gatt.connect();

			// Request characteristics we want from the services
			this.rxCharacteristic = await this.getCharacteristic(this.ble_NUS_Service_UUID, this.ble_NUS_CharRX_UUID);
			this.txCharacteristic = await this.getCharacteristic(this.ble_NUS_Service_UUID, this.ble_NUS_CharTX_UUID);
			await this.txCharacteristic.startNotifications();
			this.txCharacteristic.addEventListener('characteristicvaluechanged', this.receive);

			this.batteryCharacteristic = await this.getCharacteristic('battery_service', 'battery_level');

			// Add handler for battery characteristic
			await this.batteryCharacteristic.startNotifications();
			this.batteryCharacteristic.addEventListener('characteristicvaluechanged', this._options.onBatteryChange);

			await this.txCharacteristic.startNotifications();

			this.txCharacteristic.addEventListener('characteristicvaluechanged', this.receive);
			this._statusChange(`Connected to: ${this.bleDevice.name}`);

			return this.bleDevice.name;

		}catch(error){
			this._statusChange(`Error: ${error}`);
			if(this.bleDevice && this.bleDevice.gatt.connected){
				this.bleDevice.gatt.disconnect();
			}
			return false;
		}
	};

	// Will disconnect from a connected device
	disconnect = () => {	
		if (!this.bleDevice) {
			this._statusChange('No Bluetooth Device connected...');
			return;
		}
		this._statusChange('Disconnecting from Bluetooth Device...');
		if (this.bleDevice.gatt.connected) {
			this.bleDevice.gatt.disconnect();
			this._statusChange('Bluetooth Device connected: ' + this.bleDevice.gatt.connected);
		}else{
			this._statusChange('Bluetooth Device is already disconnected');
		}
	};

	getCharacteristic = async (service_uuid, characterstic_uuid) => {

		this._statusChange(`Locating service ${service_uuid}`);
		let service = await this.bleServer.getPrimaryService(service_uuid);
		this._statusChange(`Found service!`);
		
		this._statusChange(`Locating characteristic ${characterstic_uuid}`);
		let characteristic = await service.getCharacteristic(characterstic_uuid);
		this._statusChange('Found characteristic!');

		return characteristic;
	}

	getBattery = () => {
		return this.batteryCharacteristic.readValue();
	}

	// Returns true/false if connected to BT device
	isConnected = () => {
		return (this.bleDevice && this.bleDevice.gatt.connected);
	}

	// Handle a received message from UART
	receive = (event) => {
		let value = event.target.value;

		// Convert raw data bytes to character values and use these to 
		// construct a string.
		let str = "";
		for (let i = 0; i < value.byteLength; i++) {
			if(value.getUint8(i) == 0){
				break;
			}
			str += String.fromCharCode(value.getUint8(i));
		}

		// Pass string to handler
		this._options.onReceive(str);
	};

	// Send a new message via UART
	// @msg : String to send 
	send = (msg) => {
		if(this.bleDevice && this.bleDevice.gatt.connected) {
			console.log("send: " + msg);
			let value_arr = new Uint8Array(msg.length)
			for (let i = 0; i < msg.length; i++) {
					value_arr[i] = msg[i].charCodeAt(0);
			}
			this._sendNextChunk(value_arr);
		}
	};

	// Called recursively to send the next chunk from
	// We do this to avoid sending too much data at once
	// Pass in array of char codes to write to the BT device
	_sendNextChunk = async (value_array) => {
		let chunk = value_array.slice(0, this.msg_send_chunk_size);
		await this.rxCharacteristic.writeValue(chunk);
		if(value_array.length > this.msg_send_chunk_size){
			this._sendNextChunk(value_array.slice(this.msg_send_chunk_size));
		}
	};

	// Fire callback for a status change
	_statusChange(msg){
		this._options.onStatusChange(msg);
	}
}