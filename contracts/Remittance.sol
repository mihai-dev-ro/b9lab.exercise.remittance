pragma solidity ^0.4.18;

contract Remittance {

    address public owner;
    address public exchange;
    bytes32 puzzle;    
    uint nonce = 0; //# of attempts to withdraw
    
    event LogWithdrawalSuccess(address indexed exchange, uint256 value);
    event LogWithdrawalFailed(string exchangeSecret, string beneficiarySecret);

    function Remittance(
        address exchangeAddress,
        string exchangeSecret,
        string beneficiarySecret
    ) 
        public
        payable
    {
        // minimum validation of params
        require(exchangeAddress != 0x0);        
        require(exchangeAddress != msg.sender);
        require(msg.value > 0);

        owner = msg.sender;
        exchange = exchangeAddress;
        
        // set the puzzle
        puzzle = keccak256(bytes(exchangeSecret),
            bytes(beneficiarySecret));
    }

    function withdraw(
        string exchangeSecret,
        string beneficiarySecret
    )
        public
    {
        // only exchange can withdraw the money
        require(msg.sender == exchange);

        // this is not the first attempt to use the secrets, revert
        require(nonce == 0); 
        nonce++;
        
        // calculate the keccak256 hash 
        // of the concatenation of the two secrets
        // and verifies agains the puzzle
        if(keccak256(
            bytes(exchangeSecret), 
            bytes(beneficiarySecret)
            ) == puzzle) {
        
            uint amount = this.balance;
            msg.sender.transfer(this.balance);
            // log the event
            LogWithdrawalSuccess(msg.sender, amount);        
        } else {
            LogWithdrawalFailed(exchangeSecret, beneficiarySecret);
        }

        
    }
}