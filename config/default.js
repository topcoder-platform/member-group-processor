/**
 * The default configuration file.
 */

module.exports = {
  DISABLE_LOGGING: process.env.DISABLE_LOGGING || false, // If true, logging will be disabled
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',

  KAFKA_URL: process.env.KAFKA_URL || 'localhost:9092',
  // below are used for secure Kafka connection, they are optional
  // for the local Kafka, they are not needed
  KAFKA_CLIENT_CERT: process.env.KAFKA_CLIENT_CERT,
  KAFKA_CLIENT_CERT_KEY: process.env.KAFKA_CLIENT_CERT_KEY,

  KAFKA_TOPICS: (process.env.KAFKA_TOPICS && process.env.KAFKA_TOPICS.split(',')) ||
   ['member.action.profile.trait.create', 'member.action.profile.trait.update', 'member.action.profile.trait.delete'],

  TC_API_BASE_URL: process.env.TC_API_BASE_URL || 'https://api.topcoder.com',

  // below 5 params are used to get TC m2m token
  AUTH0_URL: process.env.AUTH0_URL,
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE || 'https://www.topcoder.com',
  TOKEN_CACHE_TIME: process.env.TOKEN_CACHE_TIME,
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,
  AUTH0_PROXY_SERVER_URL: process.env.AUTH0_PROXY_SERVER_URL
}
