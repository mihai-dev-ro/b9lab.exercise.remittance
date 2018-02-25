var Remittance = artifacts.require("Remittance");
var Promise = require("bluebird");
Promise.promisifyAll(web3.eth, {suffix: "Promise"});

contract("Remittance", (accounts) => {

    describe("validate withdrawal of remittance funds", () => {
        let exchangeAddress = accounts[1];
        let transferredAmount = 100;
        let exchangeSecret = "Secret exchange";
        let beneficiarySecret = "Secret beneficiary";

        let instance;

        beforeEach("deploy and prepare", () => {
            return Remittance.new(
                exchangeAddress,
                exchangeSecret,
                beneficiarySecret,  
                {from: accounts[0], value: transferredAmount}
                ).then(_instance => {
                    instance = _instance;});
        });


        it("should be able to withdraw the ether with the correct pair of secrets", () => {
            return instance.withdraw(exchangeSecret, beneficiarySecret, 
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

        it("should not be able to withdraw funds when Exchange Secret is not correct", () => {
            let incorrectExchangeSecret = "Bad exchange secret";

            return instance.withdraw(incorrectExchangeSecret, beneficiarySecret, 
                {from: exchangeAddress, gas: 100000})
                .then(txObj => {
                    assert.strictEqual(parseInt(txObj.receipt.status), 1, 
                        "The transaction has been completed successfully");

                    assert.equal(txObj.logs[0].event, "LogWithdrawalFailed", 
                        "The event LogWithdrawalFailed was fired");                    
                    assert.equal(txObj.logs[0].args["exchangeSecret"], 
                        incorrectExchangeSecret, 
                        "The event LogWithdrawalFailed recorded correctly the incorrect secret");

                    return web3.eth.getBalancePromise(instance.address);

                }).then((balance) => {
                    assert.equal(balance.toString(10), transferredAmount.toString(10), "the remittance contract's " +
                        "balance has not been changed");

                });
        })

        it("should not be able to withdraw funds when Beneficiary Secret is not correct", () => {
            let incorrectBeneficiarySecret = "Bad beneficiary secret";

            return instance.withdraw(exchangeSecret, incorrectBeneficiarySecret, 
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
        })
    });
}); 

