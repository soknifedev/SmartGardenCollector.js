import _sequelize from 'sequelize';

const { Model } = _sequelize;

export default class Topic extends Model {

  static findOneByName = async function(name) {
    return this.findOne({ where: { name } });
  };

  static createIfNotExists = function(name) {
    return this.findOrCreate({
      where:    { name },
      defaults: {
        name
      }
    });
  };

  static init(sequelize, DataTypes) {
    super.init({
      id: {
        autoIncrement: true,
        type:          DataTypes.INTEGER,
        allowNull:     true,
        primaryKey:    true
      },
      name: {
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
      tableName:  'topics',
      timestamps: true,
      indexes:    [
        {
          name:   'PRIMARY',
          unique: true,
          using:  'BTREE',
          fields: [
            { name: 'id' }
          ]
        }
      ]
    });
    return Topic;
  }
}
