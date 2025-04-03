// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract MockCompliance {
    mapping(address => bool) private _canTransfer;
    bool private _canMint;
    address private _token;

    function canTransfer(
        address _from,
        address /*_to*/,
        uint256 /*_amount*/
    ) external view returns (bool) {
        return _canTransfer[_from];
    }

    function transferred(
        address _from,
        address _to,
        uint256 _amount
    ) external {}

    function created(
        address _to,
        uint256 _amount
    ) external {}

    function destroyed(address _userAddress, uint256 _amount) external {}

    /**
     * @dev used for testing purpose
     */
    function setCanTransfer(address _address, bool _status) external {
        _canTransfer[_address] = _status;
    }

    function bindToken(address _tokenAddress) external {
        _token = _tokenAddress;
    }

    function unbindToken(address _tokenAddress) external {
        if (_token == _tokenAddress) {
            _token = address(0);
        }
    }
} 