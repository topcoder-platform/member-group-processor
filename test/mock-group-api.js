/**
 * The mock group API.
 */
const http = require('http')
const send = require('http-json-response')
const logger = require('../src/common/logger')
const m2mVerify = require('tc-core-library-js').auth.verifier
const verify = m2mVerify(['TopCoder'])

let groups
let groupMembers
let index

const init = () => {
  index = 1
  groups = {}
  groupMembers = {}
}

const addGroup = (group) => {
  groups[group.id] = group.name
  groupMembers[group.id] = {}
}

const addGroupMember = (groupId, memberId) => {
  groupMembers[groupId][String(memberId)] = String(index)
  index++
}

const isGroupMember = (groupId, memberId) => groupMembers[groupId][String(memberId)] !== undefined

const mockGroupApi = http.createServer((req, res) => {
  logger.debug(`${req.method} ${req.url}`)
  // Parse the token from request header
  let token
  if (req.headers.authorization) {
    const authHeaderParts = req.headers.authorization.split(' ')
    if (authHeaderParts.length === 2 && authHeaderParts[0] === 'Bearer') {
      token = authHeaderParts[1]
    }
  }

  verify.validateToken(token, 'secret', (error, decoded) => {
    logger.debug('Decoded:')
    logger.debug(decoded)
    if (error) {
      res.statusCode = 401
      res.end('Not Authorized')
    }

    if (req.method === 'GET' && req.url === '/v3/groups') {
      const content = []
      for (const groupId in groups) {
        content.push({ id: groupId, name: groups[groupId] })
      }
      return send(res, 200, { result: { content } })
    } else if (req.method === 'GET' && req.url.match(/^\/v3\/groups\/[a-zA-Z0-9-]+\/members$/)) {
      const list = req.url.split('/')
      const groupId = list[3]
      const content = []
      for (const memberId in groupMembers[groupId]) {
        if (groupMembers[groupId][memberId]) {
          content.push({ id: groupMembers[groupId][memberId], membershipType: 'user', memberId: Number(memberId) })
        }
      }
      return send(res, 200, { result: { content } })
    } else if (req.method === 'POST' && req.url.match(/^\/v3\/groups\/[a-zA-Z0-9-]+\/members$/)) {
      let body = ''
      const list = req.url.split('/')
      const groupId = list[3]
      req.on('data', chunk => {
        // Convert Buffer to string
        body += chunk.toString()
      })
      req.on('end', () => {
        try {
          body = JSON.parse(body)
        } catch (e) {
          res.statusCode = 400
          res.end('Bad Request')
        }

        logger.debug('request body:')
        logger.debug(body)

        if (body.param && body.param.membershipType === 'user' && body.param.memberId) {
          groupMembers[groupId][String(body.param.memberId)] = String(index)
          index++
          res.statusCode = 200
          res.end()
        } else {
          res.statusCode = 400
          res.end('Bad Request')
        }
      })
    } else if (req.method === 'DELETE' && req.url.match(/^\/v3\/groups\/[a-zA-Z0-9-]+\/members\/[a-zA-Z0-9-]+$/)) {
      const list = req.url.split('/')
      const groupId = list[3]
      const memberShipId = list[5]
      for (const id in groupMembers[groupId]) {
        if (groupMembers[groupId][id] === memberShipId) {
          groupMembers[groupId][id] = undefined
        }
      }
      res.statusCode = 200
      res.end()
    } else {
      // 404 for other routes
      res.statusCode = 404
      res.end('Not Found')
    }
  })
})

module.exports = {
  init,
  addGroup,
  addGroupMember,
  isGroupMember,
  mockGroupApi
}
