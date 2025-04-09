// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
struct IdentityData {
    bool isVerified;
    uint256 country;
}

contract MockIdentityRegistry {
    mapping(address => IdentityData) private _verified;

    function isVerified(address _userAddress) external view returns (bool) {
        return _verified[_userAddress].isVerified;
    }

    /**
     * @dev used for testing purpose
     */
    function setVerified(address _userAddress, bool _status) external {
        IdentityData memory data = _verified[_userAddress];
        data.isVerified = _status;
        _verified[_userAddress] = data;
    }

    /**
     * @dev used for testing purpose
     */
    function isIdentityRegistered(address _userAddress) external view returns (IdentityData memory) {
        return _verified[_userAddress];
    }

    /**
     * @dev used for testing purpose
     */
    function registerIdentity(address _userAddress, uint256 _country, bool _isVerified) external {
        _verified[_userAddress] = IdentityData(_isVerified, _country);
    }

    function identity(address /*_userAddress*/) public pure returns (address) {
        // Returning hardcoded address for testing
        return 0x26291175Fa0Ea3C8583fEdEB56805eA68289b105;
    }
} 