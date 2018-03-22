pragma solidity ^0.4.18;

import "./Pausable.sol";

contract Remittance is Pausable{

    struct Record {
        address sender;
        uint balance;
        uint deadline; //nb of block until the remittance is active
    }

    // the cost of deposit of Remittance is 454643
    uint constant REMITTANCE_FEE_GAS = 450000; 
    // roughly 4 weeks 
    uint constant DURATION_MAX = 4 * 7 * 24 * 3600 / 15;
    // all remittances 
    mapping(bytes32 => Record) public remittances;
    // the serviceFees
    uint public serviceFees;
    
    event LogNew(
        address indexed sender,  
        uint remittanceAmount,
        uint fee,
        bytes32 puzzle, 
        uint deadline
    );
    event LogWithdrawal(address indexed beneficiary, uint value);
    event LogRefund(address indexed sender, uint value);
    event LogServiceFeesWithdrawal(address owner, uint value);
    
    function Remittance() public {}

    function createPuzzle(
        address sender,
        address beneficiary, 
        bytes32 secret
    ) 
        public 
        pure 
        returns(bytes32)
    {
        return keccak256(sender, beneficiary, secret);
    }

    function getFee(uint gasPrice) public pure returns(uint) {
        return REMITTANCE_FEE_GAS * gasPrice;
    }

    function depositNew(
        bytes32 puzzleHash, 
        uint deadlineBlockNumber
    ) 
        public 
        payable
        returns(bool successful) 
    {

        // limit to how far in the future the deadline can be
        require(deadlineBlockNumber <= (block.number + DURATION_MAX));

        // make sure the transferred value covers the fee
        uint txFee = REMITTANCE_FEE_GAS * tx.gasprice;
        require(msg.value > txFee);

        // make sure there is no collision with previously recorded remittance
        Record storage remittanceRecord = remittances[puzzleHash];
        require(remittanceRecord.sender == 0x0);

        // record 
        remittances[puzzleHash] = Record(
            msg.sender,
            msg.value - txFee, 
            deadlineBlockNumber
        );
        //adds to the serviceFees
        serviceFees += txFee;

        // log event
        LogNew(
            msg.sender, 
            remittances[puzzleHash].balance,
            txFee, 
            puzzleHash, 
            deadlineBlockNumber
        );

        return true;
    }

    function withdraw(
        address remittanceSender,
        bytes32 beneficiarySecret
    )
        public
        onlyIfRunning
        returns(bool successful)
    {
        // retrieve the remittance
        Record storage remittanceRecord = remittances[
            createPuzzle(remittanceSender, msg.sender, beneficiarySecret)
        ];

        // the withdraw is possible within the validity period
        require(block.number <= remittanceRecord.deadline );

        // if not money registered at the remittanceSender's address 
        // with this secret then revert
        require(remittanceRecord.balance > 0);

        // all good so far, transfer the money
        // implement Checks-Effects-Interractions security pattern
        uint amount = remittanceRecord.balance;
        remittanceRecord.balance = 0;
        remittanceRecord.deadline = 0;
        LogWithdrawal(msg.sender, amount);             
        msg.sender.transfer(amount);

        return true;
    }

    function sendRefund(bytes32 puzzleHash) 
        public 
        onlyIfRunning 
        returns(bool successful)
    {
        // retrieve the remittance
        Record storage remittanceRecord = remittances[puzzleHash];

        // if the remittance has not been previously sent 
        // by the sender then revert
        require(remittanceRecord.sender == msg.sender);

        // if not money registered at the remittanceSender's address, revert
        require(remittanceRecord.balance > 0);

        // the refund is available only after the deadline
        require(block.number > remittanceRecord.deadline);

        uint amount = remittanceRecord.balance;
        remittanceRecord.balance = 0;
        remittanceRecord.deadline = 0;
        LogRefund(msg.sender, amount);
        msg.sender.transfer(amount);

        return true; 
    }

    function withdrawServiceFees() public onlyOwner returns(bool successful) {
        uint amount = serviceFees;
        serviceFees = 0;
        LogServiceFeesWithdrawal(msg.sender, amount);
        msg.sender.transfer(amount);

        return true;
    }

}