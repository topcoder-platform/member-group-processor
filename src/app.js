/**
 * The application entry point
 */

global.Promise = require('bluebird')
const _ = require('lodash')
const config = require('config')
const logger = require('./common/logger')
const Kafka = require('no-kafka')
const co = require('co')
const ProcessorService = require('./services/ProcessorService')
const healthcheck = require('topcoder-healthcheck-dropin')

// create consumer
const options = { connectionString: config.KAFKA_URL, groupId: config.KAFKA_GROUP_ID }
if (config.KAFKA_CLIENT_CERT && config.KAFKA_CLIENT_CERT_KEY) {
  options.ssl = { cert: config.KAFKA_CLIENT_CERT, key: config.KAFKA_CLIENT_CERT_KEY }
}
const consumer = new Kafka.GroupConsumer(options)

// data handler
const dataHandler = (messageSet, topic, partition) =>
  Promise.each(messageSet, m => {
    const message = m.message.value.toString('utf8')
    logger.info(
      `Handle Kafka event message; Topic: ${topic}; Partition: ${partition}; Offset: ${m.offset}; Message: ${message}.`
    )
    let messageJSON
    try {
      messageJSON = JSON.parse(message)
    } catch (e) {
      logger.error('Invalid message JSON.')
      logger.error(e)
      // ignore the message
      return
    }
    const payload = _.get(messageJSON, 'payload', {})
    return (
      co(function * () {
        if (topic === 'identity.notification.create') {
          yield ProcessorService.addMemberToClosedCommunity(payload)
        } else {
          if (_.get(payload, 'traitId', '').toLowerCase() !== 'communities') {
            logger.info("The message traitId field is not 'communities'. ignoring.")
          } else {
            yield ProcessorService.processMessage(payload)
          }
        }
      })
        // commit offset
        .then(() => logger.debug('Successfully processed message'))
        .catch(err => logger.error(err))
        .finally(() => {
          logger.debug('Commiting Offset')
          consumer.commitOffset({ topic, partition, offset: m.offset })
        })
    )
  })

// check if there is kafka connection alive
function check () {
  if (!consumer.client.initialBrokers && !consumer.client.initialBrokers.length) {
    return false
  }
  let connected = true
  consumer.client.initialBrokers.forEach(conn => {
    logger.debug(`url ${conn.server()} - connected=${conn.connected}`)
    connected = conn.connected & connected
  })
  return connected
}

consumer
  .init([
    {
      subscriptions: config.KAFKA_TOPICS,
      handler: dataHandler
    }
  ])
  // consume configured topics
  .then(() => {
    logger.info('Initialized.......')
    healthcheck.init([check])
    logger.info('Adding topics successfully.......')
    logger.info(config.KAFKA_TOPICS)
    logger.info('Kick Start.......')
  })
  .catch(err => logger.error(err))

if (process.env.NODE_ENV === 'test') {
  module.exports = consumer
}
