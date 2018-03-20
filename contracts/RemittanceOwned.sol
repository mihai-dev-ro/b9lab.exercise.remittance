pragma solidity ^0.4.18;

import "./RemittanceCreator.sol";

contract RemittanceOwned {

	RemittanceCreator public creator;
	address public owner;
	uint public deadline;
	bytes32 public puzzle;

	event LogWithdrawal(address indexed beneficiary, uint value );
	event LogRefund(address indexed, uint value);

	function RemittanceOwned(
		bytes32 puzzleHash,
		address remittanceOwner, 
		uint deadlineBlockNumber
	) 
		public
		payable
	{
		puzzle = puzzleHash;
		owner = remittanceOwner;
		deadline = deadlineBlockNumber;
		creator = RemittanceCreator(msg.sender);
	}

	function withdraw(bytes32 beneficiarySecret) public {
        
    	// verify the puzzle
    	require(
    		creator.createPuzzle(
    			owner, 
    			msg.sender, 
    			beneficiarySecret
    		) == puzzle);



        // if not money registered at the remittanceOwner's address 
        // with this secret then revert
        require(this.balance > 0);

        // make sure the tx is before the deadline 
        require(block.number <= deadline);

        // implement Checks-Effects-Interractions security pattern
        uint amount = this.balance;
        LogWithdrawal(msg.sender, amount);             
        msg.sender.transfer(amount);
    }

    function refund() public {
    	
    	// verify that the sender is the owner
    	require(msg.sender == owner);

    	// make sure the tx is after the deadline 
        require(block.number > deadline);

        // if no money, then revert
        require(this.balance > 0);

    	// implement Checks-Effects-Interractions security pattern
        uint amount = this.balance;
        LogRefund(msg.sender, amount);
        msg.sender.transfer(amount);
    }


}
