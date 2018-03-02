var CryptoLib = artifacts.require("CryptoLib");
var Remittance = artifacts.require("Remittance");
var Promise = require("bluebird");
Promise.promisifyAll(web3.eth, {suffix: "Promise"});
var expectedExceptionPromise = require("./expected_exception_testRPC_and_geth.js");

contract("Remittance", (accounts) => {

    describe("validate withdrawal of remittance funds", () => {
        let exchangeAddress = accounts[1];
        let transferredAmount = 100;
        let beneficiarySecret = "Secret beneficiary";
        let deadline = 1;
        let instance;

        beforeEach("deploy and prepare", () => {
            return CryptoLib.new().then((instanceLib) => {
                Remittance.link("CryptoLib", instanceLib.address);

                return instanceLib.createPuzzle(
                    exchangeAddress, 
                    beneficiarySecret
                );
            }).then(puzzleHash => {

                return Remittance.new(
                    puzzleHash,
                    deadline,
                    {from: accounts[0], value: transferredAmount}
                );
            }).then(_instance => {
                instance = _instance;
            });
        });


        it("should be able to withdraw the ether from the " + 
            "correct exchange address and with the " + 
            "correct beneficiary secret", () => {

            let exchangeBalanceBefore;
            let withdrawGasUsed;
            let withdrawGasPrice = 20000000;

            return web3.eth.getBalancePromise(exchangeAddress)
                .then(balance => {

                    exchangeBalanceBefore = balance;

                    return instance.withdraw(
                        beneficiarySecret, 
                        {from: exchangeAddress, gas: 100000, 
                            gasPrice: withdrawGasPrice}
                    );
                }).then(txObj => {

                    assert.strictEqual(parseInt(txObj.receipt.status), 1, 
                        "The transaction has been completed successfully");

                    assert.equal(txObj.logs[0].event, "LogWithdrawal", 
                        "The event LogWithdrawal was fired");                    
                    assert.equal(txObj.logs[0].args["value"].toString(10), 
                        transferredAmount.toString(10), 
                        "The event LogWithdrawal recorded correctly the transferred value");

                    // retrieve the gas used & gas price
                    withdrawGasUsed = txObj.receipt.gasUsed;

                    return web3.eth.getBalancePromise(instance.address);

                }).then((balance) => {

                    assert.equal(balance.toString(), "0", "the remittance contract's " +
                        "balance is zero");

                    return web3.eth.getBalancePromise(exchangeAddress);
                }).then(exchangeBalanceAfter => {

                    assert.equal(
                        exchangeBalanceAfter
                            .minus(exchangeBalanceBefore)
                            .plus((new web3.BigNumber(withdrawGasUsed))
                                .times(new web3.BigNumber(withdrawGasPrice)
                                )
                            )
                            .toString(10),
                        transferredAmount.toString(10),
                        "The amount has successfull arrived into the Exchange's account");
                });    
        });

        it("should not be able to withdraw funds when contract is executed " +
            "from a address different from the Exchange", () => {

            let incorrectExchangeAddress = accounts[2];

            return expectedExceptionPromise(() => {
                return instance.withdraw(
                    beneficiarySecret, 
                    {from: incorrectExchangeAddress, gas: 1000000}
                ); },
                1000000
            );
        });

        it("should not be able to withdraw funds when Beneficiary Secret is not correct", () => {
            let incorrectBeneficiarySecret = "Bad beneficiary secret";

            return expectedExceptionPromise(() => {
                return instance.withdraw(
                    incorrectBeneficiarySecret, 
                    {from: exchangeAddress, gas: 1000000}
                ); },
                1000000
            );

        });

    });
}); 

