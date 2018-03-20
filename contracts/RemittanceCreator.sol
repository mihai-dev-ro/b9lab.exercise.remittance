pragma solidity ^0.4.18;

import "./RemittanceOwned.sol";


contract RemittanceCreator {

    address public owner;
    bool isRunning = true;

    uint constant DURATION_MAX = 1000; 

    // the cost of deployment of RemittanceOwned is 454643
    uint constant REMITTANCE_FEE_GAS = 450000; 

    event LogNew(
        address indexed remittance,
        address indexed owner,
        bytes32 puzzle, 
        uint remittanceAmount,
        uint fee,  
        uint deadline
    );
    event LogWithdrawal(address indexed sender, uint value);
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
        address remittanceOwner, 
        address beneficiary, 
        bytes32 secret
    ) 
        public 
        pure 
        returns(bytes32)
    {
        return keccak256(remittanceOwner, beneficiary, secret);
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
    {

        // limit to how far in the future the deadline can be
        require(deadlineBlockNumber <= (block.number + DURATION_MAX));

        // calculate remittance fee
        uint txFee = REMITTANCE_FEE_GAS * tx.gasprice;

        // require that the transfered value covers for the fee
        require(msg.value > txFee);

        // retains the fee
        uint amount = msg.value - txFee;

        RemittanceOwned remittance = (new RemittanceOwned)
            .value(amount)(
                puzzleHash,
                msg.sender,
                deadlineBlockNumber
            );

        LogNew( 
            remittance,
            msg.sender, 
            puzzleHash, 
            amount, 
            txFee, 
            deadlineBlockNumber
        );         
    }

    function withdraw() public onlyOwner onlyIfRunning {
        require(this.balance > 0);

        uint amount = this.balance;
        LogWithdrawal(msg.sender, amount);
        msg.sender.transfer(amount);
    }

    function setRunningFlag(bool value) public onlyOwner {
        require(isRunning != value);

        isRunning = value;
        LogRunningFlagChanged(msg.sender, value);
    }

}