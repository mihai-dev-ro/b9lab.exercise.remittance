const RemittanceCreator = artifacts.require("RemittanceCreator");
const RemittanceOwned = artifacts.require("RemittanceOwned");
const Promise = require("bluebird");
Promise.promisifyAll(web3.eth, {suffix: "Promise"});
const expectedExceptionPromise = require("./expected_exception_testRPC_and_geth.js");

contract("RemittanceCreator", (accounts) => {

    describe("validate deposit of new remitatnce", () => {
        let remittanceOwnerAddress = accounts[1];
        let beneficiaryAddress = accounts[2];
        let transferredAmount = web3.toWei(0.5, "ether");
        let txGasPrice = web3.toWei(40, "gwei");
        let txFee;
        let beneficiarySecret = web3.fromUtf8("Secret beneficiary", 32);
        let deadline = 100;
        let instanceCreator;
        let remittance;

        beforeEach("deploy and prepare", () => {
            return RemittanceCreator.new({from: accounts[0]})
            .then(_instance => {
                instanceCreator = _instance;

                return instanceCreator.getFee(txGasPrice);
            }).then(fee => txFee = fee);
        });

        it("should be able to deposit new remittance", () => {
            return instanceCreator.createPuzzle(
                remittanceOwnerAddress,
                beneficiaryAddress, 
                beneficiarySecret
            ).then(puzzleHash => {
                return instanceCreator.depositNew(
                    puzzleHash, 
                    deadline, 
                    {
                        from: remittanceOwnerAddress, 
                        value: transferredAmount,
                        gasPrice: txGasPrice
                    })
            }).then(txObj => {
                assert.equal(
                    parseInt(txObj.receipt.status), 
                    1, 
                    "The depositNew transaction completed successfully"
                );

                assert.equal(
                    txObj.logs.length, 
                    1, 
                    "Exactly one event registered"
                );

                assert.equal(
                    txObj.logs[0].event, 
                    "LogNew", 
                    "LogNew event was successfully fired"
                );

                assert.isTrue(
                    web3.isAddress(txObj.logs[0].args["remittance"]),
                    "LogNew event correctly created a new Remittance contract"
                );

                return web3.eth.getBalancePromise(
                    txObj.logs[0].args["remittance"]
                );
            }).then(remittanceBalance => {

                assert.equal(
                    web3.toBigNumber(transferredAmount).minus(txFee)
                        .toString(10),
                    remittanceBalance.toString(10),
                    "Remittance's balance should be the equal to transferred" +
                    " amount minut the service fee");

                return web3.eth.getBalancePromise(instanceCreator.address);
            }).then(remittanceCreatorBalance => {

                assert.equal(
                    remittanceCreatorBalance.toString(),
                    txFee.toString(),
                    "RemittanceCreator correctly retained the fee"
                );
            });
        });

    });


    describe("validate withdrawal of remittance funds", () => {
        let remittanceOwnerAddress = accounts[1];
        let beneficiaryAddress = accounts[2];
        let beneficiarySecret = web3.fromUtf8("Secret beneficiary", 32);
        let transferredAmount = web3.toWei(0.5, "ether");
        let deadline = 1000;
        let instanceCreator;
        let remittance;
        let remittanceBalance;

        beforeEach("deploy and prepare", () => {
            return RemittanceCreator.new({from: accounts[0]})
            .then(_instance => {
                instanceCreator = _instance;

                return instanceCreator.createPuzzle(
                    remittanceOwnerAddress,
                    beneficiaryAddress,
                    beneficiarySecret
                );
            }).then(puzzleHash => {
                return instanceCreator.depositNew(
                    puzzleHash,
                    deadline,
                    {
                        from: remittanceOwnerAddress, 
                        value: transferredAmount
                    }
                );
            }).then(txObj => {
                let remittanceAddress = txObj.logs[0].args["remittance"];

                return RemittanceOwned.at(remittanceAddress);
            }).then(_instance => {

                remittance = _instance;

                return web3.eth.getBalancePromise(remittance.address);
            }).then(balance => {

                remittanceBalance = balance;
            });
        });

        it("should be able to withdraw the ether from the " + 
            "correct beneficiary address and with the " + 
            "correct beneficiary secret", () => {

            let beneficiaryBalanceBefore;
            let withdrawGasUsed;
            let withdrawGasPrice = web3.toWei(40, "gwei");

            return web3.eth.getBalancePromise(beneficiaryAddress)
            .then(balance => {

                beneficiaryBalanceBefore = balance;

                return remittance.withdraw(
                    beneficiarySecret, 
                    {
                        from: beneficiaryAddress, 
                        gas: 1000000,
                        gasPrice: withdrawGasPrice
                    }
                ); 
            }).then(txObj => {

                assert.strictEqual(parseInt(txObj.receipt.status), 1, 
                    "The transaction has been completed successfully");

                assert.equal(txObj.logs[0].event, "LogWithdrawal", 
                    "The event LogWithdrawal was fired");                    
                assert.equal(txObj.logs[0].args["value"].toString(10), 
                    remittanceBalance.toString(10), 
                    "The event LogWithdrawal recorded correctly the transferred value");
            
                withdrawGasUsed = txObj.receipt.gasUsed;

                return web3.eth.getBalancePromise(beneficiaryAddress);

            }).then(beneficiaryBalanceAfter => {

                assert.equal(
                    beneficiaryBalanceAfter
                        .minus(beneficiaryBalanceBefore)
                        .plus((new web3.BigNumber(withdrawGasUsed))
                            .times(new web3.BigNumber(withdrawGasPrice)
                            )
                        )
                        .toString(10),
                    remittanceBalance.toString(10),
                    "The amount has successfull arrived into the " + 
                    "Beneficiary's account");
            });    
        });

        it("should not be able to withdraw funds when contract is executed " +
            "from a address different from the Beneficiary", () => {

            let incorrectBeneficiaryAddress = accounts[3];

            return expectedExceptionPromise(() => {
                return remittance.withdraw(
                    beneficiarySecret, 
                    {from: incorrectBeneficiaryAddress, gas: 1000000}
                ); },
                1000000
            );
        });

        it("should not be able to withdraw funds when Beneficiary Secret is not correct", () => {
            let incorrectBeneficiarySecret = "Bad beneficiary secret";

            return expectedExceptionPromise(() => {
                return remittance.withdraw(
                    incorrectBeneficiarySecret, 
                    {from: beneficiaryAddress, gas: 1000000}
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

