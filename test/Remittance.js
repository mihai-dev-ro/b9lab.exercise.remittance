const Remittance = artifacts.require("Remittance");
const Promise = require("bluebird");
Promise.promisifyAll(web3.eth, {suffix: "Promise"});
const expectedExceptionPromise = require("./expected_exception_testRPC_and_geth.js");

contract("Remittance", (accounts) => {

    describe("validate deposit of new remittance", () => {
        let remittanceSenderAddress = accounts[1];
        let beneficiaryAddress = accounts[2];
        let beneficiarySecret = web3.fromUtf8("Secret beneficiary", 32);
        let transferredAmount = web3.toWei(0.1, "ether");
        let txGasPrice = web3.toWei(40, "gwei");
        let deadline = 10000;
        let instance;
        let remittanceAmount;
        let remittanceFee;
        let puzzleHash;

        beforeEach("deploy and prepare", () => {
            return Remittance.new({from: accounts[0]})
            .then(_instance => {
                instance = _instance;

                return instance.createPuzzle(
                    remittanceSenderAddress,
                    beneficiaryAddress, 
                    beneficiarySecret
                );
            }).then(hash => puzzleHash = hash);
        });
        
        it("should be able to deposit new remittance", () => {
            return instance.depositNew(
                puzzleHash, 
                deadline, 
                {
                    from: remittanceSenderAddress, 
                    value: transferredAmount,
                    gasPrice: txGasPrice
                }
            ).then(txObj => {
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
                assert.equal(
                    txObj.logs[0].args.sender,
                    remittanceSenderAddress,
                    "LogNew event correctly saved the remittance sender"
                );
                let fee = txObj.logs[0].args.fee;
                let amount = txObj.logs[0].args.remittanceAmount;
                assert.equal(
                    web3.toBigNumber(transferredAmount).toString(10),
                    amount.plus(fee).toString(10),
                    "LogNew event correctly saved the split of the " + 
                    "transferredAmount into the " + 
                    "remittanceAmount & remittanceFee"
                );
                assert.equal(
                    txObj.logs[0].args.deadline,
                    deadline,
                    "LogNew event correctly saved the deadline"
                );

                return instance.remittances(puzzleHash);
            }).then(
                ([
                    _sender, 
                    _amount, 
                    _deadline
                ]) => {

                assert.equal(
                    _sender, 
                    remittanceSenderAddress,
                    "Remittance sender correctly saved in the contract");

                assert.equal(
                    _deadline.toString(10),
                    deadline,
                    "Remittance deadline correctly saved in the contract");

                remittanceAmount = _amount;
                return instance.getFee(txGasPrice);
            }).then(txFee => {
                assert.equal(
                    remittanceAmount.toString(10),
                    web3.toBigNumber(transferredAmount)
                        .minus(txFee).toString(10),
                    "Remittance amount correctly saved in the contract, " +
                    "as the remaining of the transferredAmount after " + 
                    "retaining the serviceFee"
                );

                remittanceFee = txFee;

                return instance.serviceFees();
            }).then(serviceFeesRetainedInContract => {
                assert.equal(
                    remittanceFee.toString(10),
                    serviceFeesRetainedInContract.toString(10),
                    "ServiceFees correctly holds the fee from the last deposit"
                );
            });
        });
        
    });


    describe("validate withdrawal of remittance funds", () => {
        let remittanceSenderAddress = accounts[1];
        let beneficiaryAddress = accounts[2];
        let transferredAmount = web3.toWei(0.1, "ether");
        let txGasPrice = web3.toWei(40, "gwei");
        let beneficiarySecret = web3.fromUtf8("Secret beneficiary", 32);
        let deadline = 10000;
        let instance;
        let puzzleHash;
        let remittanceAmount;

        beforeEach("deploy and prepare", () => {
            return Remittance.new({from: accounts[0]})
            .then(_instance => {
                instance = _instance;

                return instance.getFee(txGasPrice);
            }).then(fee => {
                // calculate the remittance expected amount
                remittanceAmount = web3.toBigNumber(transferredAmount)
                    .minus(fee);

                return instance.createPuzzle(
                    remittanceSenderAddress,
                    beneficiaryAddress,
                    beneficiarySecret
                );
            }).then(puzzleHash => {
                return instance.depositNew(
                    puzzleHash,
                    deadline,
                    {
                        from: remittanceSenderAddress, 
                        value: transferredAmount,
                        gasPrice: txGasPrice
                    }
                );
            });
        });

        it("should be able to withdraw the ether from the " + 
            "correct exchange address and with the " + 
            "correct beneficiary secret", () => {

            let beneficiaryBalanceBefore;
            let withdrawTxCost;

            return web3.eth.getBalancePromise(beneficiaryAddress)
            .then(balance => {

                beneficiaryBalanceBefore = balance;

                return instance.withdraw(
                    remittanceSenderAddress,
                    beneficiarySecret, 
                    {
                        from: beneficiaryAddress, 
                        gas: 1000000,
                        gasPrice: txGasPrice
                    }
                );
            }).then(txObj => {

                assert.strictEqual(parseInt(txObj.receipt.status), 1, 
                    "The transaction has been completed successfully");

                assert.equal(txObj.logs[0].event, "LogWithdrawal", 
                    "The event LogWithdrawal was fired");    
                assert.equal(
                    txObj.logs[0].args.beneficiary, 
                    beneficiaryAddress, 
                    "The event LogWithdrawal correctly saved the " + 
                    "beneficiary Address"
                ); 
                assert.equal(
                    txObj.logs[0].args.value.toString(10), 
                    remittanceAmount.toString(10), 
                    "The event LogWithdrawal correctly saved the " + 
                    "remittance expected amount"
                );                  

                // retrieve the gas used & gas price
                withdrawTxCost = web3.toBigNumber(txObj.receipt.gasUsed)
                    .times(txGasPrice);

                return instance.remittances(puzzleHash);

            }).then(([,balance,]) => {

                assert.equal(balance.toString(), "0", "the remittance's " +
                    "balance is zero");

                return web3.eth.getBalancePromise(exchangeAddress);
            }).then(exchangeBalanceAfter => {

                assert.equal(
                    exchangeBalanceAfter
                        .minus(exchangeBalanceBefore)
                        .plus(withdrawTxCost)
                        .toString(10),
                    remittanceAmount.toString(10),
                    "The amount has successfull arrived into the Exchange's account");
            });    
        });

        it("should not be able to withdraw funds when contract is executed " +
            "from a address different from the Exchange", () => {

            let incorrectBeneficiaryAddress = accounts[3];

            return expectedExceptionPromise(() => {
                return instance.withdraw(
                    remittanceSenderAddress,
                    beneficiarySecret, 
                    {from: incorrectBeneficiaryAddress, gas: 1000000}
                ); },
                1000000
            );
        });

        it("should not be able to withdraw funds when Beneficiary Secret is not correct", () => {
            let incorrectBeneficiarySecret = "Bad beneficiary secret";

            return expectedExceptionPromise(() => {
                return instance.withdraw(
                    remittanceSenderAddress,
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

