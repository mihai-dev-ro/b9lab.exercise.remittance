pragma solidity ^0.4.18;

import "./CryptoLib.sol";

contract Remittance {

    struct Record {
        uint balance;
        bytes32 puzzle; // puzzle to be solved for accessing the money
        uint deadline; //nb of block until the remittance is active
        uint8 nonce; //# of attempts to withdraw
    }

    address public owner;
    bool isRunning = true;

    uint constant DURATION_MAX = 1000; 

    mapping(address => Record) remittanceOf;
    
    event LogNew(
        address indexed remittanceOwner, 
        uint value, 
        bytes32 puzzle, 
        uint deadline
    );
    event LogWithdrawal(address indexed exchange, uint value);
    event LogRefund(address indexed recipient, uint value);
    event LogRunningFlagChanged(address indexed sender, bool value);

    function Remittance() public {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);

        _;
    }

    modifier onlyIfRunning() {
        require(isRunning);

        _;
    }

    function depositNew(
        bytes32 puzzleHash, 
        uint deadlineBlockNumber
    ) 
        public 
        payable 
    {
        // minimum validation of params
        require(msg.value > 0);

        // limit to how far in the future the deadline can be
        require(deadlineBlockNumber <= (block.number + DURATION_MAX));

        remittanceOf[msg.sender] = Record(
            msg.value, 
            puzzleHash, 
            deadlineBlockNumber, 
            0
        );

        // log event
        LogNew(msg.sender, msg.value, puzzleHash, deadlineBlockNumber);
    }

    function withdraw(
        address remittanceOwner,
        string beneficiarySecret
    )
        public
        onlyIfRunning
    {
        // if not money registered at the remittanceOwner's address, revert
        require(remittanceOf[remittanceOwner].balance > 0);

        // assign the mapping value to a local storage pointer 
        Record storage record = remittanceOf[remittanceOwner];

        // this is not the first attempt to use the secrets, revert
        require(record.nonce == 0); 
        record.nonce ++;
        

        // calculate the keccak256 hash 
        // of the concatenation of the exchange's address and beneficiarySecret
        // and verifies agains the puzzle
        if(CryptoLib.isPuzzleSolved(
            record.puzzle, 
            msg.sender, 
            beneficiarySecret)
        ) {  
            // implement Checks-Effects-Interractions security pattern
            uint amount = record.balance;
            record.balance = 0;
            msg.sender.transfer(amount);

            // log the event
            LogWithdrawal(msg.sender, amount);        
        } else {
            revert();
        }
        
    }

    function getBalanceOf(
        address remittanceOwner
    )
        public
        view
        returns(uint)
    {
        return remittanceOf[remittanceOwner].balance;
    }

    function sendRefund() public onlyIfRunning {
        // if not money registered at the remittanceOwner's address, revert
        require(remittanceOf[msg.sender].balance > 0);

        // assign the mapping value to a local storage pointer  
        Record storage record = remittanceOf[msg.sender];

        uint amount = record.balance;
        if(block.number > record.deadline || 
            (record.nonce > 0 && record.balance > 0)
        ) {

            record.balance = 0;
            msg.sender.transfer(amount);
            LogRefund(msg.sender, amount);
        } 
    }

    function setRunningFlag(bool value) public onlyOwner {
        require(isRunning != value);

        isRunning = value;
        LogRunningFlagChanged(msg.sender, value);
    }

}