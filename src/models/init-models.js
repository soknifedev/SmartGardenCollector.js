import AmbientImage from  './AmbientImage.js';
import SensorData from  './SensorData.js';
import Topic from  './Topic.js';
import _sequelize from 'sequelize';

const { DataTypes } = _sequelize;

export default function initModels(sequelize) {
  const ambientImage = AmbientImage.init(sequelize, DataTypes);
  const topic = Topic.init(sequelize, DataTypes);
  const sensorData = SensorData.init(sequelize, DataTypes);

  sensorData.belongsTo(topic, { as: 'topic', foreignKey: 'topic_id' });
  topic.hasMany(sensorData, { as: 'sensors_data', foreignKey: 'topic_id' });

  return {
    AmbientImage: ambientImage,
    Topic:        topic,
    SensorData:   sensorData
  };
}
