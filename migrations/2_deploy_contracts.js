var CryptoLib = artifacts.require("./CryptoLib.sol");
var Remittance = artifacts.require("./Remittance.sol"); 

module.exports = function(deployer, network, accounts) {
    
    let exchangeAddress = accounts[1];
    let beneficiarySecret = "Secret beneficiary";
    let deadline = 1000;

    return deployer.then(() => {
        return deployer.deploy(CryptoLib);
    }).then(() => {
        deployer.link(CryptoLib, Remittance);
    }).then(() => {
        return CryptoLib.deployed();
    }).then(instance => {
        return instance.createPuzzle(exchangeAddress, beneficiarySecret);
    }).then(puzzleHash => {
        deployer.deploy(
            Remittance, 
            puzzleHash, 
            deadline, 
            {from: accounts[0], value: 100, gas: 1000000});
    });
};