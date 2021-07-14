import _sequelize from 'sequelize';
import { createHash } from 'crypto';
import path from 'path';
import { storagePath } from '../../config';
import { unlink } from 'fs';

const { Model } = _sequelize;

export default class AmbientImage extends Model {

  static createIfNotExists = async function(topicId, data) {
    // generate based on data + topicId
    const seed = String(topicId + Date.now());
    const checksum = createHash('md5').update(seed).update(data).digest('hex');
    return this.findOrCreate({
      where:    { topic_id: topicId, checksum },
      defaults: {
        topic_id: topicId,
        checksum,
        file:     `${topicId}_${checksum}.jpg`
      }
    });
  };

  destroyWithFile() {
    const imageFilePath = path.resolve(storagePath.ambient.image, this.file);
    return unlink(imageFilePath, (err) => {
      if (err) {
        if (err.code === 'ENOENT') {
          return this.destroy();
        }
        return false;
      }
      return this.destroy();
    });
  }


  static init(sequelize, DataTypes) {
    super.init({
      checksum: {
        type:       DataTypes.STRING(32),
        allowNull:  false,
        primaryKey: true
      },
      topic_id: {
        type:       DataTypes.INTEGER,
        allowNull:  false,
        references: {
          model: 'topics',
          key:   'id'
        }
      },
      file: {
        type:      DataTypes.TEXT,
        allowNull: false
      },
      replicated: {
        type:         DataTypes.BOOLEAN,
        allowNull:    false,
        defaultValue: false
      },
      replicatedAt: {
        type:      DataTypes.INTEGER,
        allowNull: true
      }
    }, {
      sequelize,
      tableName:  'ambient_images',
      timestamps: true,
      indexes:    [
        {
          name:   'PRIMARY',
          unique: true,
          using:  'BTREE',
          fields: [
            { name: 'checksum' }
          ]
        }
      ]
    });
    return AmbientImage;
  }
}
