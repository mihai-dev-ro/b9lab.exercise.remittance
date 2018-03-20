const RemittanceCreator = artifacts.require("RemittanceCreator"); 

module.exports = function(deployer, network, accounts) {
    
    deployer.deploy(RemittanceCreator, {from: accounts[0]});
};