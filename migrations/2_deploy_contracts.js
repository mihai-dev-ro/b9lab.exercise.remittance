var Remittance = artifacts.require("./Remittance.sol"); 

module.exports = function(deployer, network, accounts) {
    
    let exchangeAddress = accounts[1];
    let beneficiarySecret = "Secret beneficiary";
    let puzzle = web3.sha3(exchangeAddress + beneficiarySecret);
    let deadline = 1000;

    deployer.deploy(
        Remittance, 
        puzzle,
        deadline,
        {from: accounts[0], value: 100, gas: 1000000});    
};