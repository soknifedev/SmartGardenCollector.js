import Database from './classes/Database';
import FunctonRepeater from './util/FunctonRepeater';
import MQTTClient from './classes/MQTTClient';
import path from 'path';
import { writeFile } from 'fs';
import { limits, mqtt, storagePath } from '../config';

const MQTTConfig = mqtt;
const { settings, topics } = MQTTConfig;

const {
  AmbientImage, Topic, SensorData
} = Database.models;

function debugLog(...params) {
  console.log('debug >', ...params);
}

const requestGardenImage = async (client) => {
  console.log('requestGardenImage:', topics.garden.request.image);
  return client.publish(topics.garden.request.image, 'now');
};
const requestGardenSensors = async (client) => {
  console.log('requestGardenSensors:', topics.garden.request.sensors);
  return client.publish(topics.garden.request.sensors, 'now');
};

async function OnClientConnected(client) {
  debugLog('Connected, subscribing to topics...');
  // Log
  await Topic.createIfNotExists(topics.log.esp32cam);
  await client.subscribe(topics.log.esp32cam);

  // Ambient
  await Topic.createIfNotExists(topics.sensors.ambient.image);
  await Topic.createIfNotExists(topics.sensors.ambient.temperature);
  await client.subscribe(topics.sensors.ambient.image);
  await client.subscribe(topics.sensors.ambient.temperature);

  // Soil
  await Topic.createIfNotExists(topics.sensors.soil.moisture);
  await client.subscribe(topics.sensors.soil.moisture);

  // Actuators
  await Topic.createIfNotExists(topics.actuators.waterPump.state);
  await Topic.createIfNotExists(topics.actuators.waterPump.flow);
  await client.subscribe(topics.actuators.waterPump.state);
  await client.subscribe(topics.actuators.waterPump.flow);

  debugLog('Topic subscriptions done,');
  debugLog('Awaiting for data!');
  FunctonRepeater.repeatAwaiting(limits.dataCollectionTimeMs, requestGardenSensors, client);
  FunctonRepeater.repeatAwaiting(limits.imageCollectionTimeMs, requestGardenImage, client);

}


async function OnMqttMessage(topicName, message) {

  const topic = await Topic.findOneByName(topicName);

  if (!topic) {
    debugLog('Error:', 'Received Message from topic: ', topicName, ', but It was not found in DB.');
    return;
  }


  if (topic.name !== topics.sensors.ambient.image) {
    debugLog('OK:', 'Received data from topic: ', topicName, `: ${message}`);
    await SensorData.createIfNotExists(topic.id, message);

  } else if (topicName === topics.sensors.ambient.image) {
    debugLog('OK:', 'Received IMAGE from Topic: ', topicName, '.');

    const imageRecords = await AmbientImage.count({
      where: {
        replicated: false
      }
    });

    if (imageRecords >= limits.maximumImageFiles) {
      debugLog(topicName, `Limite de almacenamiento de imagenes (${imageRecords}) alcanzado, eliminando imagen más vieja para liberar un espacio...`);

      const oldestImage = await AmbientImage.findOne({
        order: [
          ['createdAt', 'ASC']
        ]
      });

      oldestImage.destroyWithFile();
    }

    try {

      // await Database.instance.transaction(async (transaction) => {
      const [ambientImage] = await AmbientImage.createIfNotExists(topic.id, message);

      debugLog(topicName, 'Registro de imagen creado, escribiendo archivo de imagen...', ambientImage.file);

      const imageFilePath = path.resolve(storagePath.ambient.image, ambientImage.file);

      writeFile(imageFilePath, message, 'binary', (err) => {
        if (err) {
          debugLog(topicName, 'No se pudo escribir el archivo de imagen: ', err);
          ambientImage.destroy();

          throw err;
        }

        debugLog(topicName, `Archivo de imagen ${ambientImage.file} escrito.`);
      });

      // });

    } catch (error) {
      debugLog(error);
    }

  } else {
    debugLog(`Error: Recibida información de topic no esperado "${topicName}" con el mensaje:`, message);
  }

}

export default async function start() {

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
