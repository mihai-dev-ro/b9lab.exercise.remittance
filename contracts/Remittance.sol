pragma solidity ^0.4.18;

import "./CryptoLib.sol";

contract Remittance {

    address public owner;
    bytes32 puzzle;    
    uint nonce = 0; //# of attempts to withdraw
    uint deadline; //nb of block until the remittance is active
    bool isRunning = true;

    uint constant DURATION_MAX = 1000; 
    
    event LogWithdrawal(address indexed exchange, uint256 value);
    event LogRefund(address indexed recipient, uint value);
    event LogRunningFlagChanged(address indexed sender, bool value);

    function Remittance(
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

        owner = msg.sender;
        deadline = deadlineBlockNumber;

        // set the puzzle
        puzzle = puzzleHash;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);

        _;
    }

    modifier onlyIfRunning() {
        require(isRunning);

        _;
    }

    function withdraw(
        string beneficiarySecret
    )
        public
        onlyIfRunning
    {
        // this is not the first attempt to use the secrets, revert
        require(nonce == 0); 
        nonce++;
        
        // calculate the keccak256 hash 
        // of the concatenation of the exchange's address and beneficiarySecret
        // and verifies agains the puzzle
        if(CryptoLib.isPuzzleSolved(puzzle, msg.sender, beneficiarySecret)) {
            
            uint amount = this.balance;
            msg.sender.transfer(this.balance);
            // log the event
            LogWithdrawal(msg.sender, amount);        
        } else {
            revert();
        }
        
    }

    function sendRefund() public onlyOwner onlyIfRunning {
        uint amount = this.balance;
        if(hasFailed()) {
            msg.sender.transfer(this.balance);
            LogRefund(msg.sender, amount);
        } 
    }

    function setRunningFlag(bool value) public onlyOwner {
        require(isRunning != value);

        isRunning = value;
        LogRunningFlagChanged(msg.sender, value);
    }

    function hasFailed() private view returns(bool) {
        return ((block.number > deadline) || 
            (nonce > 0 && this.balance > 0));
    } 
}