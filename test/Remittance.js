var CryptoLib = artifacts.require("CryptoLib");
var Remittance = artifacts.require("Remittance");
var Promise = require("bluebird");
Promise.promisifyAll(web3.eth, {suffix: "Promise"});
var expectedExceptionPromise = require("./expected_exception_testRPC_and_geth.js");

contract("Remittance", (accounts) => {

    
    describe("validate deposit of new remitatnce", () => {
        let remittanceOwnerAddress = accounts[1];
        let exchangeAddress = accounts[2];
        let transferredAmount = 100;
        let beneficiarySecret = "Secret beneficiary";
        let deadline = 10;
        let instance;
        let instanceCryptoLib;

        beforeEach("deploy and prepare", () => {
            return CryptoLib.new().then((instanceLib) => {
                    instanceCryptoLib = instanceLib;

                    return Remittance.link("CryptoLib", instanceLib.address);
                }).then(() => {
                    return Remittance.new({from: accounts[0]});
                }).then(_instance => {
                    instance = _instance;
                });
        });

        it("should be able to deposit new remittance", () => {
            return instanceCryptoLib.createPuzzle(
                    exchangeAddress, 
                    beneficiarySecret
                ).then(puzzleHash => {
                    return instance.depositNew(
                        puzzleHash, 
                        deadline, 
                        {from: remittanceOwnerAddress, value: transferredAmount})
                }).then(txObj => {
                    assert.equal(
                        parseInt(txObj.receipt.status), 
                        1, 
                        "The depositNew transaction completed successfully"
                    );

                    assert.equal(
                        txObj.logs[0].event, 
                        "LogNew", 
                        "LogNew event was successfully fired"
                    );

                    assert.equal(
                        txObj.logs[0].args["value"],
                        transferredAmount.toString(10),
                        "LogNew event correctly saved the transferred amount"
                    );

                    assert.equal(
                        txObj.logs[0].args["remittanceOwner"],
                        remittanceOwnerAddress,
                        "LogNew event correctly saved the remittance owner"
                    );

                });
        });

    });


    describe("validate query the contract", () => {
        let remittanceOwnerAddress = accounts[1];
        let exchangeAddress = accounts[2];
        let transferredAmount = 100;
        let beneficiarySecret = "Secret beneficiary";
        let deadline = 10;
        let instance;
        let instanceCryptoLib;

        beforeEach("deploy and prepare", () => {
            return CryptoLib.new().then((instanceLib) => {
                    instanceCryptoLib = instanceLib;

                    return Remittance.link("CryptoLib", instanceLib.address);
                }).then(() => {
                    return Remittance.new({from: accounts[0]});
                }).then(_instance => {
                    instance = _instance;

                    return instanceCryptoLib.createPuzzle(
                        exchangeAddress,
                        beneficiarySecret
                    );
                }).then(puzzleHash => {
                    return instance.depositNew(
                        puzzleHash,
                        deadline,
                        {
                            from: remittanceOwnerAddress, 
                            value: transferredAmount
                        }
                    );
                });
        });

        it("should be able to query the contract for recorded " + 
            "remittances' balance", () => {

            return instance.getBalanceOf(remittanceOwnerAddress)
                .then(balance => {
                    assert.equal(
                        balance.toString(10),
                        transferredAmount.toString(10),
                        "The remittance's balance should have the " + 
                        "transferred value"
                    );
                });        
        });
    });


    describe("validate withdrawal of remittance funds", () => {
        let remittanceOwnerAddress = accounts[1];
        let exchangeAddress = accounts[2];
        let transferredAmount = 100;
        let beneficiarySecret = "Secret beneficiary";
        let deadline = 10;
        let instance;
        let instanceCryptoLib;

        beforeEach("deploy and prepare", () => {
            return CryptoLib.new().then((instanceLib) => {
                    instanceCryptoLib = instanceLib;

                    return Remittance.link("CryptoLib", instanceLib.address);
                }).then(() => {
                    return Remittance.new({from: accounts[0]});
                }).then(_instance => {
                    instance = _instance;

                    return instanceCryptoLib.createPuzzle(
                        exchangeAddress,
                        beneficiarySecret
                    );
                }).then(puzzleHash => {
                    return instance.depositNew(
                        puzzleHash,
                        deadline,
                        {
                            from: remittanceOwnerAddress, 
                            value: transferredAmount
                        }
                    );
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
                        remittanceOwnerAddress,
                        beneficiarySecret, 
                        {
                            from: exchangeAddress, 
                            gas: 100000, 
                            gasPrice: withdrawGasPrice
                        }
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

                    return instance.getBalanceOf(remittanceOwnerAddress);

                }).then((balance) => {

                    assert.equal(balance.toString(), "0", "the remittance's " +
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

            let incorrectExchangeAddress = accounts[3];

            return expectedExceptionPromise(() => {
                return instance.withdraw(
                    remittanceOwnerAddress,
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
                    remittanceOwnerAddress,
                    incorrectBeneficiarySecret, 
                    {from: exchangeAddress, gas: 1000000}
                ); },
                1000000
            );

        });

    });

    describe("validate refund if failure to withdraw in due time", () => {
        // todo: No idea how to simulate deadline had passed
        //       I need to wait for a specific number of blocks 
        //       to be mined before running the tesr    
    });

}); 

