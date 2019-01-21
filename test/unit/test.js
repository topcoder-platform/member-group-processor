/**
 * Mocha tests of the Member Group Processor.
 */
process.env.NODE_ENV = 'test'

const _ = require('lodash')
const co = require('co')
const config = require('config')
const should = require('should')
const logger = require('../../src/common/logger')
const ProcessorService = require('../../src/services/ProcessorService')

const { testTopics } = require('../common/testData')
const { mockM2MApi } = require('../mock-m2m-api')
const {
  init,
  addGroup,
  addGroupMember,
  isGroupMember,
  mockGroupApi
} = require('../mock-group-api')

describe('Topcoder - Member Group Processor Unit Test', () => {
  let infoLogs = []
  let errorLogs = []
  let debugLogs = []
  const info = logger.info
  const error = logger.error
  const debug = logger.debug

  const assertValidationError = (err, message) => {
    err.isJoi.should.be.true()
    should.equal(err.name, 'ValidationError')
    err.details.map(x => x.message).should.containEql(message)
    errorLogs.should.not.be.empty()
    errorLogs.should.containEql(err.stack)
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
  })

  after(async () => {
    // close server
    await closeServer(mockM2MApi)
    await closeServer(mockGroupApi)
    // restore logger
    logger.error = error
    logger.info = info
    logger.debug = debug
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

  it('processor handle communities(create) success', (done) => {
    co(function * () {
      yield ProcessorService.processMessage(testTopics.create.testMessage.payload)
      isGroupMember('abc123', 12345).should.be.true()
      isGroupMember('abc124', 12345).should.be.true()
      isGroupMember('abc125', 12345).should.be.true()
      isGroupMember('abc126', 12345).should.be.true()
      should.equal(infoLogs.length, 5)
      should.equal(infoLogs[0], 'Get groups data.')
      should.equal(infoLogs[1], 'Get memberships of group abc123')
      should.equal(infoLogs[2], 'The user 12345 is already in group abc123')
      should.equal(infoLogs[3], 'Get memberships of group abc126')
      should.equal(infoLogs[4], 'Add user 12345 to group abc126')
      debugLogs.should.containEql('GET /v3/groups')
      debugLogs.should.containEql('GET /v3/groups/abc123/members')
      debugLogs.should.containEql('GET /v3/groups/abc126/members')
      debugLogs.should.containEql('POST /v3/groups/abc126/members')
    })
      .then(() => done())
      .catch(done)
  })

  it('processor handle communities(update) success', (done) => {
    co(function * () {
      yield ProcessorService.processMessage(testTopics.update.testMessage.payload)
      isGroupMember('abc123', 12345).should.be.false()
      isGroupMember('abc124', 12345).should.be.true()
      isGroupMember('abc125', 12345).should.be.true()
      isGroupMember('abc126', 12345).should.be.true()
      should.equal(infoLogs.length, 9)
      should.equal(infoLogs[0], 'Get groups data.')
      should.equal(infoLogs[1], 'Get memberships of group abc123')
      should.equal(infoLogs[2], 'Remove user 12345 from group abc123')
      should.equal(infoLogs[3], 'Get memberships of group abc124')
      should.equal(infoLogs[4], 'The user 12345 is already in group abc124')
      should.equal(infoLogs[5], 'Get memberships of group abc126')
      should.equal(infoLogs[6], 'Add user 12345 to group abc126')
      should.equal(infoLogs[7], 'Get memberships of group abc125')
      should.equal(infoLogs[8], 'The user 12345 is already in group abc125')
      debugLogs.should.containEql('GET /v3/groups')
      debugLogs.should.containEql('GET /v3/groups/abc123/members')
      debugLogs.should.containEql('DELETE /v3/groups/abc123/members/1')
      debugLogs.should.containEql('GET /v3/groups/abc124/members')
      debugLogs.should.containEql('GET /v3/groups/abc126/members')
      debugLogs.should.containEql('POST /v3/groups/abc126/members')
      debugLogs.should.containEql('GET /v3/groups/abc125/members')
    })
      .then(() => done())
      .catch(done)
  })

  it('processor handle communities(delete) success', (done) => {
    co(function * () {
      yield ProcessorService.processMessage(testTopics.delete.testMessage.payload)
      isGroupMember('abc123', 12346).should.be.false()
      isGroupMember('abc124', 12346).should.be.false()
      isGroupMember('abc125', 12346).should.be.false()
      isGroupMember('abc126', 12346).should.be.false()
      should.equal(infoLogs.length, 5)
      should.equal(infoLogs[0], 'Get groups data.')
      should.equal(infoLogs[1], 'Get memberships of group abc125')
      should.equal(infoLogs[2], 'Remove user 12346 from group abc125')
      should.equal(infoLogs[3], 'Get memberships of group abc123')
      should.equal(infoLogs[4], 'The user 12346 is already NOT in group abc123')
      should.equal(errorLogs.length, 1)
      should.equal(errorLogs[0], 'Invalid community: not_found')
      debugLogs.should.containEql('GET /v3/groups')
      debugLogs.should.containEql('GET /v3/groups/abc125/members')
      debugLogs.should.containEql('DELETE /v3/groups/abc125/members/4')
      debugLogs.should.containEql('GET /v3/groups/abc123/members')
    })
      .then(() => done())
      .catch(done)
  })

  let { requiredFields, integerFields, stringFields, arrayFields, testMessage } = testTopics['create']

  for (const requiredField of requiredFields) {
    if (requiredField !== 'topic' && requiredField !== 'payload') {
      it(`test invalid parameters, required field ${requiredField} is missing`, (done) => {
        co(function * () {
          let message = _.cloneDeep(testMessage)
          message = _.omit(message, requiredField)
          try {
            yield ProcessorService.processMessage(message.payload)
            throw new Error('should not throw error here')
          } catch (err) {
            assertValidationError(err, `"${_.last(requiredField.split('.'))}" is required`)
          }
        })
          .then(() => done())
          .catch(done)
      })
    }
  }

  for (const stringField of stringFields) {
    if (stringField !== 'topic') {
      it(`test invalid parameters, invalid string type field ${stringField}`, (done) => {
        co(function * () {
          let message = _.cloneDeep(testMessage)
          _.set(message, stringField, 123)
          try {
            yield ProcessorService.processMessage(message.payload)
            throw new Error('should not throw error here')
          } catch (err) {
            assertValidationError(err, `"${_.last(stringField.split('.'))}" must be a string`)
          }
        })
          .then(() => done())
          .catch(done)
      })
    }
  }

  for (const integerField of integerFields) {
    it(`test invalid parameters, invalid integer type field ${integerField}(wrong number)`, (done) => {
      co(function * () {
        let message = _.cloneDeep(testMessage)
        _.set(message, integerField, 'string')
        try {
          yield ProcessorService.processMessage(message.payload)
          throw new Error('should not throw error here')
        } catch (err) {
          assertValidationError(err, `"${_.last(integerField.split('.'))}" must be a number`)
        }
      })
        .then(() => done())
        .catch(done)
    })

    it(`test invalid parameters, invalid integer type field ${integerField}(wrong integer)`, (done) => {
      co(function * () {
        let message = _.cloneDeep(testMessage)
        _.set(message, integerField, 1.1)
        try {
          yield ProcessorService.processMessage(message.payload)
          throw new Error('should not throw error here')
        } catch (err) {
          assertValidationError(err, `"${_.last(integerField.split('.'))}" must be an integer`)
        }
      })
        .then(() => done())
        .catch(done)
    })

    it(`test invalid parameters, invalid integer type field ${integerField}(negative)`, (done) => {
      co(function * () {
        let message = _.cloneDeep(testMessage)
        _.set(message, integerField, -1)
        try {
          yield ProcessorService.processMessage(message.payload)
          throw new Error('should not throw error here')
        } catch (err) {
          assertValidationError(err, `"${_.last(integerField.split('.'))}" must be larger than or equal to 1`)
        }
      })
        .then(() => done())
        .catch(done)
    })
  }

  for (const arrayField of arrayFields) {
    it(`invalid parameters, invalid array type field ${arrayField}(wrong array type)`, (done) => {
      co(function * () {
        let message = _.cloneDeep(testMessage)
        _.set(message, arrayField, 'invalidArray')
        try {
          yield ProcessorService.processMessage(message.payload)
          throw new Error('should not throw error here')
        } catch (err) {
          assertValidationError(err, `"${_.last(arrayField.split('.'))}" must be an array`)
        }
      })
        .then(() => done())
        .catch(done)
    })
  }
})
