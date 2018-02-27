var Remittance = artifacts.require("Remittance");
var Promise = require("bluebird");
Promise.promisifyAll(web3.eth, {suffix: "Promise"});

contract("Remittance", (accounts) => {

    describe("validate withdrawal of remittance funds", () => {
        let exchangeAddress = accounts[1];
        let transferredAmount = 100;
        let beneficiarySecret = "Secret beneficiary";
        let puzzle = web3.sha3(exchangeAddress + beneficiarySecret);
        let deadline = 1000;
        let instance;

        beforeEach("deploy and prepare", () => {
            return Remittance.new(
                puzzle,
                deadline,
                {from: accounts[0], value: transferredAmount}
                ).then(_instance => {
                    instance = _instance;});
        });


        it("should be able to withdraw the ether from the " + 
            "correct exchange address and with the " + 
            "correct beneficiary secret", () => {

            return instance.withdraw(beneficiarySecret, 
                {from: exchangeAddress, gas: 100000})
                .then(txObj => {
                    assert.strictEqual(parseInt(txObj.receipt.status), 1, 
                        "The transaction has been completed successfully");

                    assert.equal(txObj.logs[0].event, "LogWithdrawalSuccess", 
                        "The event LogWithdrawalSuccess was fired");                    
                    assert.equal(txObj.logs[0].args["value"].toString(10), 
                        transferredAmount.toString(10), 
                        "The event LogWithdrawalSuccess recorded correctly the transferred value");

                    return web3.eth.getBalancePromise(instance.address);

                }).then((balance) => {
                    assert.equal(balance.toString(), "0", "the remittance contract's " +
                        "balance is zero");

                });    
        });

        it("should not be able to withdraw funds when contract is executed " +
            "from a address different from the Exchange", () => {

            let incorrectExchangeAddress = accounts[2];

            return instance.withdraw(beneficiarySecret, 
                {from: incorrectExchangeAddress, gas: 100000})
                .then(txObj => {
                    assert.strictEqual(parseInt(txObj.receipt.status), 1, 
                        "The transaction has been completed successfully");

                    assert.equal(txObj.logs[0].event, "LogWithdrawalFailed", 
                        "The event LogWithdrawalFailed was fired");                    
                    assert.equal(txObj.logs[0].args["exchange"], 
                        incorrectExchangeAddress, 
                        "The event LogWithdrawalFailed recorded correctly " + 
                        "incorrect exchange address");

                    return web3.eth.getBalancePromise(instance.address);

                }).then((balance) => {
                    assert.equal(balance.toString(10), transferredAmount.toString(10), "the remittance contract's " +
                        "balance has not been changed");

                });
        });

        it("should not be able to withdraw funds when Beneficiary Secret is not correct", () => {
            let incorrectBeneficiarySecret = "Bad beneficiary secret";

            return instance.withdraw(incorrectBeneficiarySecret, 
                {from: exchangeAddress, gas: 100000})
                .then(txObj => {
                    assert.strictEqual(parseInt(txObj.receipt.status), 1, 
                        "The transaction has been completed successfully");

                    assert.equal(txObj.logs[0].event, "LogWithdrawalFailed", 
                        "The event LogWithdrawalFailed was fired");                    
                    assert.equal(txObj.logs[0].args["beneficiarySecret"], 
                        incorrectBeneficiarySecret, 
                        "The event LogWithdrawalFailed recorded correctly the incorrect secret");

                    return web3.eth.getBalancePromise(instance.address);

                }).then((balance) => {
                    assert.equal(balance.toString(10), transferredAmount.toString(10), "the remittance contract's " +
                        "balance has not been changed");

                });
        });
    });
}); 

