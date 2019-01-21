/**
 * The test configuration.
 */
const MOCK_M2M_API_PORT = 4000
const MOCK_GROUP_API_PORT = 4001

module.exports = {
  LOG_LEVEL: 'debug',
  MOCK_M2M_API_PORT,
  MOCK_GROUP_API_PORT,
  // The M2M API URL
  TC_API_BASE_URL: `http://localhost:${MOCK_GROUP_API_PORT}`,
  // configuration for TC M2M API
  AUTH0_URL: `http://localhost:${MOCK_M2M_API_PORT}/m2m`,
  AUTH0_AUDIENCE: 'https://www.topcoder.com',
  AUTH0_CLIENT_ID: 'test_id',
  AUTH0_CLIENT_SECRET: 'test_secret',
  WAIT_TIME: 1500
}
