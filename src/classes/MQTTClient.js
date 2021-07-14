import MQTT from 'async-mqtt';

export default class MQTTClient {
  constructor(host, port, username, password) {
    this.host = host || 'localhost';
    this.port = port || 1883;
    this.username = username;
    this.password = password;
    this.protocol = 'mqtt';
  }

  getConnectionUrl() {
    return `${this.protocol}://${this.host}:${this.port}`;
  }

  async connect() {
    this.client = await MQTT.connect(this.getConnectionUrl(), {
      username: this.username,
      password: this.password
    });
    return this.client;
  }

  isConnected() {
    return this.client !== undefined && this.client.connected();
  }

}
