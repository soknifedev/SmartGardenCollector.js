import { Sequelize } from 'sequelize';
import assert from 'assert';
import { db } from '../../config';
import initModels from '../models/init-models';
import { sync } from 'pouchdb-node';

export default {

  get instance() {
    return this.sequelize;
  },

  get models() {
    return this.sequelizeModels;
  },

  async connect() {
    console.log('Connecting to DB...');

    const sequelize = new Sequelize(db.name, db.username, db.password, {
      host:    db.host,
      dialect: db.dialect,
      // storage: db?.storage,
      pool:    db?.pool,
      logging: false
      // retry:   {
      //   max: 10
      // }
    });

    try {
      await sequelize.authenticate();
      console.log('Connected !');
    } catch (error) {
      assert(!error, `Could not connect to database: ${error?.message}`);
    }

    this.sequelize = sequelize;
    this.sequelizeModels = initModels(this.sequelize);
    return this.sequelize;
  },

  disconnect() {
    return this.sequelize.close();
  },

  sync(force) {
    return this.sequelize.sync({
      force
    });
  }
};
