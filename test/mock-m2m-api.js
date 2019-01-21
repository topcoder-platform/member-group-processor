/**
 * The mock M2M API.
 */
const config = require('config')
const http = require('http')
const send = require('http-json-response')
const logger = require('../src/common/logger')
const jwt = require('jsonwebtoken')

const mockM2MApi = http.createServer((req, res) => {
  logger.debug(`${req.method} ${req.url}`)
  if (req.method === 'POST' && req.url === '/m2m') {
    let body = ''
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

      if (body.grant_type === 'client_credentials' && body.client_id === config.AUTH0_CLIENT_ID &&
        body.client_secret === config.AUTH0_CLIENT_SECRET && body.audience === config.AUTH0_AUDIENCE) {
        const token = jwt.sign({ iss: 'TopCoder', exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) },
          'secret')
        return send(res, 200, { access_token: token })
      } else {
        return send(res, 200, {})
      }
    })
  } else {
    // 404 for other routes
    res.statusCode = 404
    res.end('Not Found')
  }
})

/*
if (!module.parent) {
  const port = config.MOCK_M2M_API_PORT || 4000
  mockM2MApi.listen(port)
  console.log(`mock m2m api is listen port ${port}`)
}
*/
module.exports = {
  mockM2MApi
}
