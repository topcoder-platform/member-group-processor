/**
 * Service for community processor.
 */
const _ = require('lodash')
const Joi = require('joi')
const logger = require('../common/logger')
const helper = require('../common/helper')
const config = require('config')
const axios = require('axios')

/**
 * Process Kafka message
 * @param {Object} message the message
 */
function * processMessage (message) {
  // find out all 'true' communities
  const communities = []
  _.each(message.traits.data, (item) => {
    _.forIn(item, (value, key) => {
      if (value) {
        const c = key.toLowerCase()
        if (_.indexOf(communities, c) < 0) {
          communities.push(c)
        }
      }
    })
  })
  if (communities.length === 0) {
    return
  }

  // get groups
  const token = yield helper.getM2Mtoken()
  const tcAPIClient = axios.create({
    baseURL: config.TC_API_BASE_URL,
    timeout: 10000,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  const groupsRes = yield tcAPIClient.get('/v3/groups')
  const groups = groupsRes.data

  const memberId = message.userId
  // handle each community
  for (let i = 0; i < communities.length; i += 1) {
    const community = communities[i]
    // find corresponding group id
    const group = _.find(groups.result.content, (g) => g.name && g.name.toLowerCase() === community)
    if (!group) {
      logger.error(`Invalid community: ${community}`)
    } else {
      const groupId = group.id
      logger.info(`Associate member ${memberId} to group ${groupId}`)
      yield tcAPIClient.post(`/v3/groups/${groupId}/members`, { memberId, membershipType: 'user' })
    }
  }
}

processMessage.schema = {
  message: Joi.object().keys({
    userId: Joi.number().integer().min(1).required(),
    userHandle: Joi.string().required(),
    traitId: Joi.string().required(),
    categoryName: Joi.string().required(),
    createdBy: Joi.number().integer().min(1).required(),
    createdAt: Joi.string().required(),
    updatedBy: Joi.number().integer().min(1),
    updatedAt: Joi.string(),
    traits: Joi.object().keys({
      data: Joi.array().items(Joi.object())
    }).required()
  }).required()
}

// Exports
module.exports = {
  processMessage
}

logger.buildService(module.exports)
