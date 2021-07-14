import Database from '../classes/Database';
import { Op } from 'sequelize';
import RemoteAPI from '../classes/RemoteAPI';
import async from 'async';
import path from 'path';
import { stat } from 'fs';
import { storagePath } from '../../config';

function debugLog(...params) {
  console.log('DEBUG >', ...params);
}

async function freeStorage(models) {
  // Elimina los datos viejos, replicados o no.
  // Es necesario porque el Raspberry Pi tiene recursos limitados,
  // No podemos mantener una gran cantidad de datos almacenados en él.

  const {
    SensorData, AmbientImage
  } = models;

  const where = {
    createdAt: {
      [Op.lte]: Database.instance.literal('UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 1 HOUR))')
    }
  };

  await SensorData.destroy({ where })
    .then((result) => debugLog('Cantidad de registros viejos de información eliminados: ', result));

  await AmbientImage.findAll({ where })
    .then(async (ambientImages) => {
      if (ambientImages.length <= 0) return;

      // TODO: buscar archivos en el directorio de ambientImages
      // para ser eliminados en caso de no existir en la DB
      debugLog(`Eliminando ${ambientImages.length} imagenes...`);
      await async.each(ambientImages, async (ambientImage) => {
        debugLog(`Eliminando archivo y registro de imagen ${ambientImage.file}...`);
        ambientImage.destroyWithFile();
      });
    });
}


async function replicateData(models) {
  const {
    Topic, SensorData, AmbientImage
  } = models;

  debugLog('Buscando topics no replicados...');
  await Topic.findAll({
    where: {
      replicated: false
    }
  })
    .then(async (topics) => {
      debugLog(`Replicando ${topics.length} topics...`);
      await async.each(topics, async (topic) => {
        // debugLog(`replicando topic ${topic.id}...`);

        const responseCode = await RemoteAPI.topic(topic.toJSON());
        const replicated = responseCode === 200;

        if (replicated) {
          topic.replicated = true;
          topic.replicatedAt = Date.now();
          await topic.save();
          debugLog(`Topic ${topic.id} replicado! -> ${responseCode}!`);
        } else {
          debugLog(`Topic ${topic.id} no se pudo replicar! -> ${responseCode}`);
        }
      });
    })
    .catch((err) => {
      debugLog('No se pudieron replicar los topics:', err);
    });

  await SensorData.findAll({
    where: {
      replicated: false
    }
  })
    .then(async (sensorsData) => {
      debugLog(`Replicando ${sensorsData.length} datos de sensores...`);
      await async.each(sensorsData, async (sensorData) => {
        // debugLog(`Replicando datos de sensor ${sensorData.checksum}...`);

        const responseCode = await RemoteAPI.sensorData(sensorData.toJSON());
        const replicated = responseCode === 200;

        if (replicated) {
          sensorData.replicated = true;
          sensorData.replicatedAt = Date.now();
          await sensorData.save();
          debugLog(`Datos de sensor ${sensorData.checksum} replicados -> ${responseCode}!`);
        } else {
          debugLog(`Datos de sensor ${sensorData.checksum} no se pudieron replicar! -> ${responseCode}`);
        }
      });
    })
    .catch((err) => {
      debugLog('No se pudieron replicar los datos de los sensores:', err);
    });


  await AmbientImage.findAll({
    where: {
      replicated: false
    },
    limit: 10,
    order: [
      ['createdAt', 'DESC']
    ]
  })
    .then(async (ambientImages) => {
      debugLog(`Replicando ${ambientImages.length} imagenes...`);
      await async.each(ambientImages, async (ambientImage) => {
        // debugLog(`Replicando registro y archivo de imagen ${ambientImage.file}...`);
        const imageFilePath = path.resolve(storagePath.ambient.image, ambientImage.file);

        stat(imageFilePath, async (err) => {
          if (err) {
            if (err.code === 'ENOENT') {
              ambientImage.destroy();
            }

            debugLog(`Archivo de imagen ${ambientImage.checksum} ${ambientImage.file} no se pudo replicar! -> ${err.message}`);
            return;
          }

          const responseCode = await RemoteAPI.ambientImage(ambientImage.toJSON());
          const replicated = responseCode === 200;

          if (replicated) {
            ambientImage.replicated = true;
            ambientImage.replicatedAt = Date.now();
            await ambientImage.save();
            debugLog(`Archivo de imagen ${ambientImage.checksum} replicado -> ${responseCode}!`);
          } else {
            debugLog(`Archivo de imagen ${ambientImage.checksum} ${ambientImage.file} no se pudo replicar! -> ${responseCode}`);
          }
        });


      });
    })
    .catch((err) => debugLog('No se pudieron replicar los archivos de imagen:', err));

}

export default async function start() {
  debugLog('Iniciando tarea replicate.js...');
  await Database.connect();
  await Database.sync();


  await freeStorage(Database.models);
  await replicateData(Database.models);
}

start();
