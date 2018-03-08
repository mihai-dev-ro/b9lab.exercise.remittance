pragma solidity ^0.4.18;

contract Remittance {

    struct Record {
        address owner;
        uint balance;
        uint deadline; //nb of block until the remittance is active
    }

    address public owner;
    bool isRunning = true;

    uint constant DURATION_MAX = 1000; 

    mapping(bytes32 => Record) remittances;
    
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

    function createPuzzle(
        address addr, 
        bytes32 secret
    ) 
        public 
        pure 
        returns(bytes32)
    {
        return keccak256(addr, secret);
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

        // make sure there is no collision with previously recorded remittance
        Record storage remittanceRecord = remittances[puzzleHash];
        require(remittanceRecord.owner == 0x0);

        // record 
        remittances[puzzleHash] = Record(
            msg.sender,
            msg.value, 
            deadlineBlockNumber
        );

        // log event
        LogNew(msg.sender, msg.value, puzzleHash, deadlineBlockNumber);
    }

    function withdraw(
        address remittanceOwner,
        bytes32 beneficiarySecret
    )
        public
        onlyIfRunning
    {
        // retrieve the remittance
        Record storage remittanceRecord = remittances[
            createPuzzle(msg.sender, beneficiarySecret)
        ];

        // if the remittance is not owned by the remittanceOwner then revert
        require(remittanceRecord.owner == remittanceOwner);

        // if not money registered at the remittanceOwner's address 
        // with this secret then revert
        require(remittanceRecord.balance > 0);

        // all good so far, transfer the money
        // implement Checks-Effects-Interractions security pattern
        uint amount = remittanceRecord.balance;
        remittanceRecord.balance = 0;
        LogWithdrawal(msg.sender, amount);             
        msg.sender.transfer(amount);
    }

    function getRemittanceFor(
        address exchange,
        bytes32 beneficiarySecret
    )
        public
        view
        onlyIfRunning
        returns(uint)
    {
        return remittances[
            createPuzzle(exchange, beneficiarySecret)
        ].balance;
    }

    function sendRefund(
        address exchange, 
        bytes32 beneficiarySecret
    ) 
        public 
        onlyIfRunning 
    {
        // retrieve the remittance
        Record storage remittanceRecord = remittances[
            createPuzzle(exchange, beneficiarySecret)
        ];

        // if the remittance is not owned by the sender then revert
        require(remittanceRecord.owner == msg.sender);

        // if not money registered at the remittanceOwner's address, revert
        require(remittanceRecord.balance > 0);

        uint amount = remittanceRecord.balance;
        if((block.number > remittanceRecord.deadline) || 
            (remittanceRecord.balance > 0)
        ) {

            remittanceRecord.balance = 0;
            LogRefund(msg.sender, amount);
            msg.sender.transfer(amount);
        } 
    }

    function setRunningFlag(bool value) public onlyOwner {
        require(isRunning != value);

        isRunning = value;
        LogRunningFlagChanged(msg.sender, value);
    }

}