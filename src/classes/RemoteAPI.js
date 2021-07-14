import FormData from 'form-data';
import axios from 'axios';
import { createReadStream } from 'fs';
import path from 'path';
import { api, storagePath } from '../../config';

export default class RemoteAPI {

  static async topic(topic) {
    if (!topic) {
      return 500;
    }

    return RemoteAPI.post(api.topic, topic);
  }

  static async sensorData(sensor) {
    if (!sensor) {
      return 500;
    }

    return RemoteAPI.post(api.sensor, {
      ...sensor,
      data: sensor.data?.toString('binary') || sensor.data
    });
  }

  static async ambientImage(ambientImage) {
    if (!ambientImage) {
      return 500;
    }


    const form = new FormData();
    const imageFilePath = path.resolve(storagePath.ambient.image, ambientImage.file);

    form.append('imageFile', createReadStream(imageFilePath), ambientImage.file);

    Object.keys(ambientImage).forEach((key) => {
      const item = ambientImage[key];

      if (key !== 'file' && item !== null && item !== undefined) {
        if (item instanceof Date) {
          form.append(key, item?.toISOString());
        } else {
          form.append(key, item?.toString() || item);
        }
      }
    });
    // console.log('form string:', { ...form, ...ambientImage });
    return RemoteAPI.post(api.image, form, form.getHeaders());
  }


  static async post(url, data, headers) {
    if (!url || !data) {
      return 500;
    }

    const options = {
      method:  'POST',
      url,
      headers: {
        'User-Agent': 'SmartGaden.js/1.0 (+https://github.com/soknifedev/smartgarden.js-raspberry-pi-client)',
        ...headers
      },
      data
    };

    // console.log('RemoteAPI.js', `REQUEST ${url} with options: `, options);
    return axios
      .request(options)
      .then((response) => {
        return response?.status;
      })
      .catch((e) => {
        // console.error('RemoteAPI.js', e?.message);
        return e?.response?.status || 500;
      });
  }

}
