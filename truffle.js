module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
    networks: {
        development: {
            host: "127.0.0.1",
            port: 8545,
            network_id: "*", // Match any network id
            gas: 1000000
        },
        "net42": {
            host: "127.0.0.1",
            port: 8545,
            network_id: 42,
            gas: 1000000
        }
    }
};