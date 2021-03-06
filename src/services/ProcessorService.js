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
  _.each(traits, item => {
    _.forIn(item, (value, key) => {
      const c = key.toLowerCase()
      if (_.indexOf(communities, c) < 0) {
        if (value != null) {
          communities.push(c)
          flags.push(value)
        }
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

  // handle each community
  const memberId = message.userId

  // get group members
  logger.info(`Get groups of member ${memberId}`)
  const memberGroupsRes = yield tcAPIClient.get(`/v5/groups/?memberId=${memberId}&membershipType=user`)
  const memberGroups = memberGroupsRes.data

  for (let i = 0; i < communities.length; i += 1) {
    const community = communities[i]
    const flag = flags[i]
    console.log(`${community} = ${flag}`)

    // find corresponding group id
    const groupsRes = yield tcAPIClient.get(`/v5/groups?name=${community}`)
    const group = groupsRes.data[0]
    const groupId = group.oldId

    // find user from group members
    const foundMembership = _.find(memberGroups, g => g.oldId === groupId)
    if (flag) {
      if (!foundMembership) {
        logger.info(`Add user ${memberId} to group ${groupId}`)
        yield tcAPIClient.post(`/v5/groups/${groupId}/members`, { memberId: memberId.toString(), membershipType: 'user' })
      } else {
        logger.info(`The user ${memberId} is already in group ${groupId}`)
      }
    } else {
      if (flag != null && foundMembership) {
        logger.info(`Remove user ${memberId} from group ${groupId}`)
        yield tcAPIClient.delete(`/v5/groups/${groupId}/members/${memberId}`)
      }
    }
  }
}

processMessage.schema = {
  message: Joi.object()
    .keys({
      userId: Joi.number()
        .integer()
        .min(1)
        .required(),
      userHandle: Joi.string(),
      traitId: Joi.string().required(),
      categoryName: Joi.string().required(),
      createdBy: Joi.number()
        .integer()
        .min(1)
        .required(),
      createdAt: Joi.string().required(),
      updatedBy: Joi.number()
        .integer()
        .min(1),
      updatedAt: Joi.string(),
      traits: Joi.object()
        .keys({
          traitId: Joi.string(),
          data: Joi.array().items(Joi.object())
        })
        .required()
    })
    .required()
}

/**
 * Process `identity creation` messages and add members to the closed community|groups
 * @param {Object} message the message payload
 */
function * addMemberToClosedCommunity (message) {
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

  logger.info(`Getting SSO Provider from message`)
  const provider = _.get(message, 'profile.provider', undefined)
  logger.info(`Got SSO Provider ${provider} from message`)

  if (provider) {
    logger.info(`/v5/groups?ssoId=${provider}`)
    let groupsRes = yield tcAPIClient.get(`/v5/groups?ssoId=${provider}`)

    let groupId = _.get(_.first(groupsRes.data), 'oldId')
    logger.info(`Got groupId ${groupId} for SSO Provider ${provider}`)

    if (groupId) {
      logger.info(`Add user ${message.id} to group ${groupId}`)
      yield tcAPIClient.post(`/v5/groups/${groupId}/members`, { memberId: message.id.toString(), membershipType: 'user' })
    } else {
      logger.info(`Group not found having ssoId ${provider}`)
    }
  }
}

// Exports
module.exports = {
  processMessage,
  addMemberToClosedCommunity
}

logger.buildService(module.exports)
