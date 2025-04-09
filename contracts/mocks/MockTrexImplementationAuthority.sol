// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract MockTrexImplementationAuthority {
    address _tokenImplementation;
    
    constructor(address tokenImplementation) {
      _tokenImplementation = tokenImplementation;
    }

    function getTokenImplementation() external view returns (address) {
        return _tokenImplementation;
    }

    function updateTokenImplementation(address newTokenImplementation) external {
      _tokenImplementation = newTokenImplementation;
    }
} 