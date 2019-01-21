# Topcoder - Community Processor

## Dependencies

- nodejs https://nodejs.org/en/ (v8+)
- Kafka

## Configuration

Configuration for the notification server is at `config/default.js`.
The following parameters can be set in config files or in env variables:

- DISABLE_LOGGING: whether to disable logging
- LOG_LEVEL: the log level; default value: 'debug'
- KAFKA_URL: comma separated Kafka hosts; default value: 'localhost:9092'
- KAFKA_CLIENT_CERT: Kafka connection certificate, optional; default value is undefined;
    if not provided, then SSL connection is not used, direct insecure connection is used;
    if provided, it can be either path to certificate file or certificate content
- KAFKA_CLIENT_CERT_KEY: Kafka connection private key, optional; default value is undefined;
    if not provided, then SSL connection is not used, direct insecure connection is used;
    if provided, it can be either path to private key file or private key content
- KAFKA_GROUP_ID: Kafka group id, default value is 'tc-member-group-processor-group'
- KAFKA_TOPICS: Kafka topics to listen, default value is ['member.action.profile.trait.create', 'member.action.profile.trait.update', 'member.action.profile.trait.delete']
- TC_API_BASE_URL: TC API base URL, default value is 'https://api.topcoder.com'
- AUTH0_URL: Auth0 URL, used to get TC M2M token
- AUTH0_AUDIENCE: Auth0 audience, used to get TC M2M token
- TOKEN_CACHE_TIME: Auth0 token cache time, used to get TC M2M token
- AUTH0_CLIENT_ID: Auth0 client id, used to get TC M2M token
- AUTH0_CLIENT_SECRET: Auth0 client secret, used to get TC M2M token

In order to properly get TC M2M token, the AUTH0_URL, AUTH0_CLIENT_ID and AUTH0_CLIENT_SECRET must be set properly, e.g.
export AUTH0_URL="<Auth0 URL>"
export AUTH0_CLIENT_ID="<Auth0 Client ID>"
export AUTH0_CLIENT_SECRET="<Auth0 Client Secret>"

Configuration for test is at config/test.js:

- MOCK_M2M_API_PORT: the port of mock M2M api, default value: 4000
- MOCK_GROUP_API_PORT: the port of mock group api, default value: 4001
- WAIT_TIME: wait time used in test, default is 1500 or 1.5 second

## Local Kafka setup

- `http://kafka.apache.org/quickstart` contains details to setup and manage Kafka server,
  below provides details to setup Kafka server in Mac, Windows will use bat commands in bin/windows instead
- download kafka at `https://www.apache.org/dyn/closer.cgi?path=/kafka/1.1.0/kafka_2.11-1.1.0.tgz`
- extract out the doanlowded tgz file
- go to extracted directory kafka_2.11-0.11.0.1
- start ZooKeeper server:
  `bin/zookeeper-server-start.sh config/zookeeper.properties`
- use another terminal, go to same directory, start the Kafka server:
  `bin/kafka-server-start.sh config/server.properties`
- note that the zookeeper server is at localhost:2181, and Kafka server is at localhost:9092
- use another terminal, go to same directory, create some topics:
  `bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic member.action.profile.trait.create`
  `bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic member.action.profile.trait.update`
  `bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic member.action.profile.trait.delete`
- verify that the topics are created:
  `bin/kafka-topics.sh --list --zookeeper localhost:2181`,
  it should list out the created topics
- run the producer and then write some message into the console to send to the `member.action.profile.trait.create` topic:
  `bin/kafka-console-producer.sh --broker-list localhost:9092 --topic member.action.profile.trait.create`
  in the console, write message, one message per line:
  `{ "payload": { "userId": 23225544, "userHandle": "lazybaer", "traitId": "communities", "categoryName": "Communities", "createdBy": 23225544, "createdAt": "8/7/18 9:58 PM", "updatedBy": 23225544, "updatedAt": "8/7/18 9:58 PM", "traits": { "data": [{ "cognitive": true, "blockchain": false, "ios": false, "predix": false }] } } }`
- optionally, use another terminal, go to same directory, start a consumer to view the messages:
  `bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic member.action.profile.trait.create --from-beginning`
- writing/reading messages to/from other topics are similar

## Local deployment

- install dependencies `npm i`
- run code lint check `npm run lint`, running `npm run lint:fix` can fix some lint errors if any
- start processor app `npm start`

## Local Deployment with Docker

To run the Member Group Processor app using docker, follow the below steps

1. Navigate to the directory docker
2. Rename the file sample.api.env to api.env
3. Set the required configuration in the file api.env
4. Once that is done, run the following command

```bash
docker-compose up
```

## Verification

- start kafka server, start processor app
- start kafka-console-producer to write messages to `member.action.profile.trait.create` topic:
  `bin/kafka-console-producer.sh --broker-list localhost:9092 --topic member.action.profile.trait.create`
- write message:
  `{ "payload": { "userId": 23225544, "userHandle": "lazybaer", "traitId": "communities", "categoryName": "Communities", "createdBy": 23225544, "createdAt": "8/7/18 9:58 PM", "updatedBy": 23225544, "updatedAt": "8/7/18 9:58 PM", "traits": { "data": [{ "cognitive": true, "blockchain": false, "ios": false, "predix": false }] } } }`
- watch the app console, it should show info of processing the message

## Example bus payload

```
{
  "userId": 23225544,
  "userHandle": "lazybaer",
  "traitId": "communities",
  "categoryName": "Communities",
  "createdAt": "8/7/18 9:58 PM",
  "updatedBy": 23225544,
  "traits": {
    "data": [
      {
        "cognitive": true,
        "blockchain": true,
        "ios": true,
        "predix": false
      }
    ]
  },
  "createdBy": 23225544,
  "updatedAt": "8/15/18 6:22 PM"
}
```

## Testing
- Run `npm run test` to execute unit tests.
- RUN `npm run e2e` to execute e2e tests.
