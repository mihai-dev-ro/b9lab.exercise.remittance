pragma solidity ^0.4.18;

import "./Owned.sol";

contract Pausable is Owned {
    bool isRunning = true;

    event LogRunningFlagChanged(address indexed sender, bool value);

    modifier onlyIfRunning() {  
        require(isRunning); 
    
        _;  
    }

    function setRunningFlag(bool value) public onlyOwner {
        require(isRunning != value);

        isRunning = value;
        LogRunningFlagChanged(msg.sender, value);
    }
}