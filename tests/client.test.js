import MQTTClient from '../src/classes/MQTTClient';
import { mqtt } from '../config';
import path from 'path';
import { readFileSync } from 'fs';

const MQTTConfig = mqtt;
const { settings, topics } = MQTTConfig;

function debugLog(...params) {
  console.log('debug >', ...params);
}

function publishBinary(client, topic, data) {
  debugLog('\r\n', `[${topic}]`, 'Publishting (', typeof data, '): ');

  const buf = (typeof data === 'number') ? String(data) : Buffer.from(data, 'binary');

  console.log(buf, '\r\n');

  return client.publish(topic, buf);

}


async function OnClientConnected(client) {
  debugLog('Connected, publishing to topics...');
  // Log
  await publishBinary(client, topics.log.esp32cam, 'ESP32CAM Log Simulation Text');

  // Ambient
  const imageFilePath = path.resolve('tests/db/ambient/image.jpg');

  await publishBinary(client, topics.sensors.ambient.image, readFileSync(imageFilePath));
  await publishBinary(client, topics.sensors.ambient.temperature, 22.5);

  // Soil
  await publishBinary(client, topics.sensors.soil.moisture, 500);

  // Actuators
  await publishBinary(client, topics.actuators.waterPump.state, 1);

  await publishBinary(client, topics.actuators.waterPump.flow, 2);

  debugLog('Topic publishing done,');
  debugLog('Awaiting for data!');
}


async function OnMqttMessage(topicName, message) {
  debugLog('MQTT Message from:', topicName, 'with data:', message);
}

export default async function start() {
  debugLog('Starting client.test.js sequence...');

  const mqc  = new MQTTClient(settings.host, settings.port, settings.username, settings.password);

  debugLog('Connecting to MQTT: ', mqc.getConnectionUrl(), '...');

  const client = await mqc.connect();

  client.on('connect', () => OnClientConnected(client));
  client.on('message', OnMqttMessage);
  client.on('reconnect', async () => {
    debugLog('Reconnecting to', mqc.getConnectionUrl(), '...');
  });
  client.on('offline', async () => {
    debugLog('Client connection closed!');
  });
  client.on('error', async (err) => {
    debugLog('Could not connect to server!', err.code);
  });
  client.on('disconnect', async () => {
    debugLog('Client disconnected by broker!');
  });


}
