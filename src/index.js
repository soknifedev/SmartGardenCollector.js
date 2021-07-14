import   Database     from './classes/Database';
import   assert       from 'assert';
import   config       from '../config';

if (config.mode === 'dev') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const bootstrap = async () => {
  await Database.connect();
  await Database.sync();

  assert(config?.mqtt, 'Please specify MQTT settings');

  const client = (await import('./client')).default;

  client();
};

bootstrap()
  .then  (()  => console.log('SmartGarden.js Server Started'))
  .catch ((err) => console.error(err));
