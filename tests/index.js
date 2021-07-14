import config from '../config';

if (config.mode === 'dev') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const bootstrap = async () => {
  const client = (await import('./client.test')).default;

  client();
};

bootstrap()
  .then  (()  => console.log('SmartGarden.js Test Started'))
  .catch ((err) => console.error(err));
