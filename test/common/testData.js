/*
 * Test data to be used in tests
 */
const messageRequiredFields = ['topic', 'payload']
const stringFields = ['topic']
const testTopics = {
  'create': {
    requiredFields: [...messageRequiredFields, 'payload.userId', 'payload.traitId', 'payload.categoryName',
      'payload.createdBy', 'payload.createdAt', 'payload.traits'],
    integerFields: ['payload.userId', 'payload.createdBy', 'payload.updatedBy'],
    stringFields: [...stringFields, 'payload.userHandle', 'payload.traitId', 'payload.categoryName',
      'payload.createdAt', 'payload.updatedAt', 'payload.traits.traitId'],
    arrayFields: ['payload.traits.data'],
    testMessage: {
      topic: 'member.action.profile.trait.create',
      payload: {
        'userId': 12345,
        'userHandle': 'handle_12345',
        'traitId': 'communities',
        'categoryName': 'Communities',
        'createdAt': '8/7/18 9:58 PM',
        'updatedBy': 12345,
        'traits': {
          'traitId': 'communities',
          'data': [
            {
              'name_abc123': true,
              'name_abc126': true
            },
            {
              'name_aBc126': true
            }
          ]
        },
        'createdBy': 12345,
        'updatedAt': '8/15/18 6:22 PM'
      }
    }
  },
  'update': {
    requiredFields: [...messageRequiredFields, 'payload.userId', 'payload.traitId', 'payload.categoryName',
      'payload.createdBy', 'payload.createdAt', 'payload.traits'],
    integerFields: ['payload.userId', 'payload.createdBy', 'payload.updatedBy'],
    stringFields: [...stringFields, 'payload.userHandle', 'payload.traitId', 'payload.categoryName',
      'payload.createdAt', 'payload.updatedAt', 'payload.traits.traitId'],
    arrayFields: ['payload.traits.data'],
    testMessage: {
      topic: 'member.action.profile.trait.update',
      payload: {
        'userId': 12345,
        'userHandle': 'handle_12345',
        'traitId': 'communities',
        'categoryName': 'Communities',
        'createdAt': '8/7/18 9:58 PM',
        'updatedBy': 12345,
        'traits': {
          'traitId': 'communities',
          'data': [
            {
              'name_abc123': false,
              'name_abc124': true,
              'name_abc126': true
            },
            {
              'name_abc124': false,
              'name_ABC125': true,
              'name_aBc126': false
            }
          ]
        },
        'createdBy': 12345,
        'updatedAt': '8/15/18 6:22 PM'
      }
    }
  },
  'delete': {
    requiredFields: [...messageRequiredFields, 'payload.userId', 'payload.traitId', 'payload.categoryName',
      'payload.createdBy', 'payload.createdAt', 'payload.traits'],
    integerFields: ['payload.userId', 'payload.createdBy', 'payload.updatedBy'],
    stringFields: [...stringFields, 'payload.userHandle', 'payload.traitId', 'payload.categoryName',
      'payload.createdAt', 'payload.updatedAt', 'payload.traits.traitId'],
    arrayFields: ['payload.traits.data'],
    testMessage: {
      topic: 'member.action.profile.trait.delete',
      payload: {
        'userId': 12346,
        'userHandle': 'handle_12346',
        'traitId': 'communities',
        'categoryName': 'Communities',
        'createdAt': '8/7/18 9:58 PM',
        'updatedBy': 12345,
        'traits': {
          'traitId': 'communities',
          'data': [
            {
              'name_abc125': false,
              'name_abc123': false
            },
            {
              'name_ABC125': false,
              'not_found': false
            }
          ]
        },
        'createdBy': 12345,
        'updatedAt': '8/15/18 6:22 PM'
      }
    }
  }
}

module.exports = {
  testTopics
}
