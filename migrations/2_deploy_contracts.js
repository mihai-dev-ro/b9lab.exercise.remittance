var CryptoLib = artifacts.require("./CryptoLib.sol");
var Remittance = artifacts.require("./Remittance.sol"); 

module.exports = function(deployer, network, accounts) {
    
    let exchangeAddress = accounts[1];
    let beneficiarySecret = "Secret beneficiary";
    let deadline = 1000;

    return deployer.then(() => {
        return deployer.deploy(CryptoLib);
    }).then(() => {
        return deployer.link(CryptoLib, Remittance);
    }).then(() => {
        return deployer.deploy(
            Remittance, 
            {from: accounts[0], gas: 1000000});
    });
};