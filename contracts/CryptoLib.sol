pragma solidity ^0.4.18;

library CryptoLib {
	function createPuzzle(
		address addr,
		string secret
	) 
		public
		pure 
		returns(bytes32) 
	{
		return keccak256(addr, secret);
	}

	function isPuzzleSolved(
		bytes32 puzzle, 
		address addr, 
		string secret
	)
		public
		pure 
		returns(bool)
	{
		return (puzzle == keccak256(addr, secret));
	}
}