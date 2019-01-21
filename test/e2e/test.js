/**
 * E2E test of the Member Group Processor.
 */
process.env.NODE_ENV = 'test'

global.Promise = require('bluebird')

const _ = require('lodash')
const axios = require('axios')
const config = require('config')
const should = require('should')
const Kafka = require('no-kafka')
const logger = require('../../src/common/logger')

const { testTopics } = require('../common/testData')
const { mockM2MApi } = require('../mock-m2m-api')
const {
  init,
  addGroup,
  addGroupMember,
  isGroupMember,
  mockGroupApi
} = require('../mock-group-api')

describe('Topcoder - Member Group Processor E2E Test', () => {
  let app
  let infoLogs = []
  let errorLogs = []
  let debugLogs = []
  const info = logger.info
  const error = logger.error
  const debug = logger.debug

  const options = { connectionString: config.KAFKA_URL, groupId: config.KAFKA_GROUP_ID }
  if (config.KAFKA_CLIENT_CERT && config.KAFKA_CLIENT_CERT_KEY) {
    options.ssl = { cert: config.KAFKA_CLIENT_CERT, key: config.KAFKA_CLIENT_CERT_KEY }
  }

  const producer = new Kafka.Producer(options)

  /**
   * Sleep with time from input
   * @param time the time input
   */
  async function sleep (time) {
    await new Promise((resolve) => {
      setTimeout(resolve, time)
    })
  }

  /**
   * Send message
   * @param testMessage the test message
   */
  const sendMessage = async (testMessage) => {
    await producer.send({
      topic: testMessage.topic,
      message: {
        value: JSON.stringify(testMessage)
      }
    })
  }

  /**
   * Consume not committed messages before e2e test
   */
  const consumeMessages = async () => {
    // remove all not processed messages
    const consumer = new Kafka.GroupConsumer(options)
    await consumer.init([{
      subscriptions: config.KAFKA_TOPICS,
      handler: (messageSet, topic, partition) => Promise.each(messageSet,
        (m) => consumer.commitOffset({ topic, partition, offset: m.offset }))
    }])
    // make sure process all not committed messages before test
    await sleep(2 * config.WAIT_TIME)
    await consumer.end()
  }

  // the message patter to get topic/partition/offset
  const messagePattern = /^Handle Kafka event message; Topic: (.+); Partition: (.+); Offset: (.+); Message: (.+).$/
  /**
   * Wait job finished with successful log or error log is found
   */
  const waitJob = async () => {
    while (true) {
      if (errorLogs.length > 0) {
        if (infoLogs.length && messagePattern.exec(infoLogs[0])) {
          const matchResult = messagePattern.exec(infoLogs[0])
          // only manually commit for error message during test
          await app.commitOffset({
            topic: matchResult[1],
            partition: parseInt(matchResult[2]),
            offset: parseInt(matchResult[3])
          })
        }
        break
      }
      if (infoLogs.some(x => String(x) === 'The message traitId field is not \'communities\'. ignoring.')) {
        break
      }
      if (debugLogs.some(x => String(x).includes('Successfully processed message'))) {
        break
      }
      // use small time to wait job and will use global timeout so will not wait too long
      await sleep(config.WAIT_TIME)
    }
  }

  const assertErrorMessage = (message) => {
    errorLogs.should.not.be.empty()
    errorLogs.some(x => String(x).includes(message)).should.be.true()
  }

  /**
   * Start http server with port
   * @param {Object} server the server
   * @param {Number} port the server port
   */
  const startServer = (server, port) => new Promise((resolve) => {
    server.listen(port, () => {
      resolve()
    })
  })

  /**
   * Close http server
   */
  const closeServer = (server) => new Promise((resolve) => {
    server.close(() => {
      resolve()
    })
  })

  before(async () => {
    await startServer(mockM2MApi, config.MOCK_M2M_API_PORT)
    await startServer(mockGroupApi, config.MOCK_GROUP_API_PORT)
    // inject logger with log collector
    logger.info = (message) => {
      infoLogs.push(message)
      if (!config.DISABLE_LOGGING) {
        info(message)
      }
    }
    logger.debug = (message) => {
      debugLogs.push(message)
      if (!config.DISABLE_LOGGING) {
        debug(message)
      }
    }
    logger.error = (message) => {
      errorLogs.push(message)
      if (!config.DISABLE_LOGGING) {
        error(message)
      }
    }
    await consumeMessages()
    // start kafka producer
    await producer.init()
    // start the application (kafka listener)
    app = require('../../src/app')
    // wait until consumer init successfully
    while (true) {
      if (infoLogs.some(x => String(x).includes('Kick Start'))) {
        break
      }
      await sleep(config.WAIT_TIME)
    }
  })

  after(async () => {
    // close server
    await closeServer(mockM2MApi)
    await closeServer(mockGroupApi)
    // restore logger
    logger.error = error
    logger.info = info
    logger.debug = debug

    try {
      await producer.end()
    } catch (err) {
      // ignore
    }
    try {
      await app.end()
    } catch (err) {
      // ignore
    }
  })

  beforeEach(() => {
    init()
    addGroup({ id: 'abc123', name: 'name_abc123' })
    addGroup({ id: 'abc124', name: 'name_ABC124' })
    addGroup({ id: 'abc125', name: 'name_abc125' })
    addGroup({ id: 'abc126', name: 'name_abc126' })
    addGroupMember('abc123', 12345)
    addGroupMember('abc124', 12345)
    addGroupMember('abc125', 12345)
    addGroupMember('abc125', 12346)
    // clear logs
    infoLogs = []
    debugLogs = []
    errorLogs = []
  })

  it('Should setup healthcheck with check on kafka connection', async () => {
    const healthcheckEndpoint = `http://localhost:${process.env.PORT || 3000}/health`
    let result = await axios.get(healthcheckEndpoint)
    should.equal(result.status, 200)
    should.deepEqual(result.data, { checksRun: 1 })
    debugLogs.should.match(/connected=true/)
  })

  it('Should handle invalid json message', async () => {
    const { testMessage } = testTopics.create
    await producer.send({
      topic: testMessage.topic,
      message: {
        value: '[ invalid'
      }
    })
    await waitJob()
    should.equal(errorLogs[0], 'Invalid message JSON.')
  })

  it('Should handle invalid traitId field message', async () => {
    const { testMessage } = testTopics.create
    let message = _.cloneDeep(testMessage)
    message.payload.traitId = 'invalid'
    await producer.send({
      topic: testMessage.topic,
      message: {
        value: JSON.stringify(message)
      }
    })
    await waitJob()
    infoLogs.should.containEql('The message traitId field is not \'communities\'. ignoring.')
  })

  it('processor create topic success', async () => {
    await sendMessage(testTopics.create.testMessage)
    await waitJob()
    isGroupMember('abc123', 12345).should.be.true()
    isGroupMember('abc124', 12345).should.be.true()
    isGroupMember('abc125', 12345).should.be.true()
    isGroupMember('abc126', 12345).should.be.true()
    infoLogs.should.containEql('Get groups data.')
    infoLogs.should.containEql('Get memberships of group abc123')
    infoLogs.should.containEql('The user 12345 is already in group abc123')
    infoLogs.should.containEql('Get memberships of group abc126')
    infoLogs.should.containEql('Add user 12345 to group abc126')
    debugLogs.should.containEql('GET /v3/groups')
    debugLogs.should.containEql('GET /v3/groups/abc123/members')
    debugLogs.should.containEql('GET /v3/groups/abc126/members')
    debugLogs.should.containEql('POST /v3/groups/abc126/members')
  })

  it('processor update topic success', async () => {
    await sendMessage(testTopics.update.testMessage)
    await waitJob()
    isGroupMember('abc123', 12345).should.be.false()
    isGroupMember('abc124', 12345).should.be.true()
    isGroupMember('abc125', 12345).should.be.true()
    isGroupMember('abc126', 12345).should.be.true()
    infoLogs.should.containEql('Get groups data.')
    infoLogs.should.containEql('Get memberships of group abc123')
    infoLogs.should.containEql('Remove user 12345 from group abc123')
    infoLogs.should.containEql('Get memberships of group abc124')
    infoLogs.should.containEql('The user 12345 is already in group abc124')
    infoLogs.should.containEql('Get memberships of group abc126')
    infoLogs.should.containEql('Add user 12345 to group abc126')
    infoLogs.should.containEql('Get memberships of group abc125')
    infoLogs.should.containEql('The user 12345 is already in group abc125')
    debugLogs.should.containEql('GET /v3/groups')
    debugLogs.should.containEql('GET /v3/groups/abc123/members')
    debugLogs.should.containEql('DELETE /v3/groups/abc123/members/1')
    debugLogs.should.containEql('GET /v3/groups/abc124/members')
    debugLogs.should.containEql('GET /v3/groups/abc126/members')
    debugLogs.should.containEql('POST /v3/groups/abc126/members')
    debugLogs.should.containEql('GET /v3/groups/abc125/members')
  })

  it('processor delete topic success', async () => {
    await sendMessage(testTopics.delete.testMessage)
    await waitJob()
    isGroupMember('abc123', 12346).should.be.false()
    isGroupMember('abc124', 12346).should.be.false()
    isGroupMember('abc125', 12346).should.be.false()
    isGroupMember('abc126', 12346).should.be.false()
    infoLogs.should.containEql('Get groups data.')
    infoLogs.should.containEql('Get memberships of group abc125')
    infoLogs.should.containEql('Remove user 12346 from group abc125')
    infoLogs.should.containEql('Get memberships of group abc123')
    infoLogs.should.containEql('The user 12346 is already NOT in group abc123')
    errorLogs.should.containEql('Invalid community: not_found')
    debugLogs.should.containEql('GET /v3/groups')
    debugLogs.should.containEql('GET /v3/groups/abc125/members')
    debugLogs.should.containEql('DELETE /v3/groups/abc125/members/4')
    debugLogs.should.containEql('GET /v3/groups/abc123/members')
  })

  for (const testTopic of Object.keys(testTopics)) {
    let { requiredFields, integerFields, stringFields, arrayFields, testMessage } = testTopics[testTopic]

    for (const requiredField of requiredFields) {
      if (requiredField !== 'topic' && requiredField !== 'payload' && requiredField !== 'payload.traitId') {
        it(`test ${testTopic} topic - invalid parameters, required field ${requiredField} is missing`, async () => {
          let message = _.cloneDeep(testMessage)
          message = _.omit(message, requiredField)
          await sendMessage(message)
          await waitJob()
          assertErrorMessage(`"${_.last(requiredField.split('.'))}" is required`)
        })
      }
    }

    for (const stringField of stringFields) {
      if (stringField !== 'topic' && stringField !== 'payload.traitId') {
        it(`test ${testTopic} topic - invalid parameters, invalid string type field ${stringField}`, async () => {
          let message = _.cloneDeep(testMessage)
          _.set(message, stringField, 456)
          await sendMessage(message)
          await waitJob()
          assertErrorMessage(`"${_.last(stringField.split('.'))}" must be a string`)
        })
      }
    }

    for (const integerField of integerFields) {
      it(`test ${testTopic} topic - parameters, invalid integer type field ${integerField}(wrong number)`, async () => {
        let message = _.cloneDeep(testMessage)
        _.set(message, integerField, 'string')
        await sendMessage(message)
        await waitJob()
        assertErrorMessage(`"${_.last(integerField.split('.'))}" must be a number`)
      })

      it(`test ${testTopic} topic - parameters, invalid integer type field ${integerField}(wrong integer)`, async () => {
        let message = _.cloneDeep(testMessage)
        _.set(message, integerField, 1.1)
        await sendMessage(message)
        await waitJob()
        assertErrorMessage(`"${_.last(integerField.split('.'))}" must be an integer`)
      })

      it(`test ${testTopic} topic - parameters, invalid integer type field ${integerField}(negative)`, async () => {
        let message = _.cloneDeep(testMessage)
        _.set(message, integerField, -1)
        await sendMessage(message)
        await waitJob()
        assertErrorMessage(`"${_.last(integerField.split('.'))}" must be larger than or equal to 1`)
      })
    }

    for (const arrayField of arrayFields) {
      it(`test ${testTopic} topic - parameters, invalid array type field ${arrayField}(wrong array type)`, async () => {
        let message = _.cloneDeep(testMessage)
        _.set(message, arrayField, 'invalidArray')
        await sendMessage(message)
        await waitJob()
        assertErrorMessage(`"${_.last(arrayField.split('.'))}" must be an array`)
      })
    }
  }
})
