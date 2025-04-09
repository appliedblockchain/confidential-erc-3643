// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {UCEF3643} from '../UCEF3643.sol';

contract MockNewTokenImplementation is UCEF3643 {
    // Overriding a method for testing
    function allowance(address /*owner*/, address /*spender*/) public view virtual override returns (uint256) {
      // Mock value to check in tests
      return 99900;
    }
}
