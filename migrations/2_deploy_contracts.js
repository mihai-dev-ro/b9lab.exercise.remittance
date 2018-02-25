var Remittance = artifacts.require("./Remittance.sol"); 

module.exports = function(deployer, network, accounts) {
    
    deployer.deploy(
        Remittance, 
        accounts[1],
        "secret recipient",
        "secret exchange",
        {from: accounts[0], value: 100});    
};