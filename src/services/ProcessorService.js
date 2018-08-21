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
 * Process Kafka message payload
 * @param {Object} message the message payload
 */
function * processMessage (message) {
  // find out communities and flags
  const communities = []
  const flags = []
  const traits = _.get(message, 'traits.data', [])
  _.each(traits, (item) => {
    _.forIn(item, (value, key) => {
      const c = key.toLowerCase()
      if (_.indexOf(communities, c) < 0) {
        communities.push(c)
        flags.push(value)
      }
    })
  })

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
  logger.info('Get groups data.')
  const groupsRes = yield tcAPIClient.get('/v3/groups')
  const groups = groupsRes.data

  // handle each community
  const memberId = message.userId
  for (let i = 0; i < communities.length; i += 1) {
    const community = communities[i]
    const flag = flags[i]
    // find corresponding group id
    const group = _.find(groups.result.content, (g) => g.name && g.name.toLowerCase() === community)
    if (!group) {
      logger.error(`Invalid community: ${community}`)
      continue
    }
    const groupId = group.id
    // get group members
    logger.info(`Get memberships of group ${groupId}`)
    const groupMembersRes = yield tcAPIClient.get(`/v3/groups/${groupId}/members`)
    const groupMembers = groupMembersRes.data
    // find user from group members
    const foundMembership = _.find(groupMembers.result.content, (m) => m.membershipType === 'user' && m.memberId === memberId)
    if (flag) {
      // add user if user is not in the group
      if (!foundMembership) {
        logger.info(`Add user ${memberId} to group ${groupId}`)
        yield tcAPIClient.post(`/v3/groups/${groupId}/members`, { param: { memberId, membershipType: 'user' } })
      } else {
        logger.info(`The user ${memberId} is already in group ${groupId}`)
      }
    } else {
      // remove user if user is in the group
      if (foundMembership) {
        logger.info(`Remove user ${memberId} from group ${groupId}`)
        yield tcAPIClient.delete(`/v3/groups/${groupId}/members/${foundMembership.id}`)
      } else {
        logger.info(`The user ${memberId} is already NOT in group ${groupId}`)
      }
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
