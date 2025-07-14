// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

// This imported contract is modified here (patches/@tokenysolutions__t-rex@4.1.6.patch) to add "virtual" modifier to selected methods enabling contract extension
import {Token} from "@tokenysolutions/t-rex/contracts/token/Token.sol";
import {IIdentityRegistry} from "@tokenysolutions/t-rex/contracts/registry/interface/IIdentityRegistry.sol";

/**
 * @dev Abstract contract that provides private event emission functionality
 * This contract defines the PrivateEvent that can be used to emit private events
 * with restricted visibility to specific addresses
 */
abstract contract PrivateEventEmitter {
    /**
     * @dev Emitted when a private event is logged
     * @param allowedViewers Array of addresses authorized to view this event
     * @param eventType The keccak256 hash of the original event signature
     * @param payload ABI-encoded event arguments
     */
    event PrivateEvent(
        address[] allowedViewers,
        bytes32 indexed eventType,
        bytes payload
    );
}

contract UCEF3643 is Token, PrivateEventEmitter {

    // ERC-3643 Original events keccak256 hashes
    bytes32 public constant EVENT_TYPE_TRANSFER = keccak256("Transfer(address,address,uint256)");
    bytes32 public constant EVENT_TYPE_APPROVAL = keccak256("Approval(address,address,uint256)");
    bytes32 public constant EVENT_TYPE_TOKENS_FROZEN = keccak256("TokensFrozen(address,uint256)");
    bytes32 public constant EVENT_TYPE_TOKENS_UNFROZEN = keccak256("TokensUnfrozen(address,uint256)");

    // Auditor role management
    address public auditor;
    event AuditorChanged(address indexed previousAuditor, address indexed newAuditor);

    /**
     * @dev Sets the auditor address. Only callable by agents.
     */
    function setAuditor(address _auditor) external onlyAgent {
        address previousAuditor = auditor;
        auditor = _auditor;
        emit AuditorChanged(previousAuditor, _auditor);
    }

    /**
     * @dev Returns the balance of the specified account if authorized
     * @param account The address to query the balance of
     * @return uint256 The balance if authorized, 0 if unauthorized
     */
    function balanceOf(address account) public view override returns (uint256) {
        bool authorized = _authorizeBalance(account);
        return authorized ? _balanceOf(account): 0;
    }

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     * 
     * Access Control:
     * - Only the token owner or the approved spender can view the allowance
     * - Any other address attempting to view the allowance will trigger UCEFUnauthorizedBalanceAccess
     * 
     * Requirements:
     * - msg.sender must be either the owner or the spender of the allowance
     * 
     * @param owner The address that owns the tokens
     * @param spender The address that can spend the tokens
     * @return uint256 The number of tokens the spender is allowed to spend
     * @custom:error UCEFUnauthorizedBalanceAccess Thrown when an unauthorized address attempts to view the allowance
     */
    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        require(msg.sender == owner || msg.sender == spender, "Unauthorized allowance access");
        return _allowance(owner, spender);
    }

    /**
     *  @dev ERC-3643 (v4.1.6) replacing `balanceOf` with `_balanceOf`
     *  @notice ERC-20 overridden function that include logic to check for trade validity.
     *  Require that the msg.sender and to addresses are not frozen.
     *  Require that the value should not exceed available balance .
     *  Require that the to address is a verified address
     *  @param _to The address of the receiver
     *  @param _amount The number of tokens to transfer
     *  @return `true` if successful and revert if unsuccessful
     */
    function transfer(address _to, uint256 _amount) public override whenNotPaused returns (bool) {
        require(!_frozen[_to] && !_frozen[msg.sender], "wallet is frozen");
        require(_amount <= _balanceOf(msg.sender) - (_frozenTokens[msg.sender]), "Insufficient Balance");
        if (_tokenIdentityRegistry.isVerified(_to) && _tokenCompliance.canTransfer(msg.sender, _to, _amount)) {
            _transfer(msg.sender, _to, _amount);
            _tokenCompliance.transferred(msg.sender, _to, _amount);
            return true;
        }
        revert("Transfer not possible");
    }

    /**
     *  @dev ERC-3643 (v4.1.6) replacing `balanceOf` with `_balanceOf`
     *  @notice ERC-20 overridden function that include logic to check for trade validity.
     *  Require that the from and to addresses are not frozen.
     *  Require that the value should not exceed available balance .
     *  Require that the to address is a verified address
     *  @param _from The address of the sender
     *  @param _to The address of the receiver
     *  @param _amount The number of tokens to transfer
     *  @return `true` if successful and revert if unsuccessful
     */
    function transferFrom(
        address _from,
        address _to,
        uint256 _amount
    ) external override whenNotPaused returns (bool) {
        require(!_frozen[_to] && !_frozen[_from], "wallet is frozen");
        require(_amount <= _balanceOf(_from) - (_frozenTokens[_from]), "Insufficient Balance");
        if (_tokenIdentityRegistry.isVerified(_to) && _tokenCompliance.canTransfer(_from, _to, _amount)) {
            _approve(_from, msg.sender, _allowances[_from][msg.sender] - (_amount));
            _transfer(_from, _to, _amount);
            _tokenCompliance.transferred(_from, _to, _amount);
            return true;
        }
        revert("Transfer not possible");
    }

    /**
     *  @dev ERC-3643 (v4.1.6) replacing `balanceOf` with `_balanceOf`; and emitting private TokensUnfrozen event.
     *  @dev See {IToken-forcedTransfer}.
     */
    function forcedTransfer(
        address _from,
        address _to,
        uint256 _amount
    ) public override onlyAgent returns (bool) {
        require(_balanceOf(_from) >= _amount, "sender balance too low");
        uint256 freeBalance = _balanceOf(_from) - (_frozenTokens[_from]);
        if (_amount > freeBalance) {
            uint256 tokensToUnfreeze = _amount - (freeBalance);
            _frozenTokens[_from] = _frozenTokens[_from] - (tokensToUnfreeze);
            _emitPrivateTokensUnfrozen(_from, tokensToUnfreeze);
        }
        if (_tokenIdentityRegistry.isVerified(_to)) {
            _transfer(_from, _to, _amount);
            _tokenCompliance.transferred(_from, _to, _amount);
            return true;
        }
        revert("Transfer not possible");
    }

    /**
     *  @dev ERC-3643 (v4.1.6) replacing `balanceOf` with `_balanceOf`; and emitting private TokensUnfrozen event.
     *  @dev See {IToken-burn}.
     */
    function burn(address _userAddress, uint256 _amount) public override onlyAgent {
        require(_balanceOf(_userAddress) >= _amount, "cannot burn more than balance");
        uint256 freeBalance = _balanceOf(_userAddress) - _frozenTokens[_userAddress];
        if (_amount > freeBalance) {
            uint256 tokensToUnfreeze = _amount - (freeBalance);
            _frozenTokens[_userAddress] = _frozenTokens[_userAddress] - (tokensToUnfreeze);
            _emitPrivateTokensUnfrozen(_userAddress, tokensToUnfreeze);
        }
        _burn(_userAddress, _amount);
        _tokenCompliance.destroyed(_userAddress, _amount);
    }

    /**
     *  @dev ERC-3643 (v4.1.6) replacing `balanceOf` with `_balanceOf`; and emitting private TokensFrozen event
     *  @dev See {IToken-freezePartialTokens}.
     */
    function freezePartialTokens(address _userAddress, uint256 _amount) public override onlyAgent {
        uint256 balance = _balanceOf(_userAddress);
        require(balance >= _frozenTokens[_userAddress] + _amount, "Amount exceeds available balance");
        _frozenTokens[_userAddress] = _frozenTokens[_userAddress] + (_amount);
        _emitPrivateTokensFrozen(_userAddress, _amount);
    }

    /**
     *   @dev ERC-3643 (v4.1.6) emitting private TokensUnfrozen event.
     *  @dev See {IToken-unfreezePartialTokens}.
     */
    function unfreezePartialTokens(address _userAddress, uint256 _amount) public override onlyAgent {
        require(_frozenTokens[_userAddress] >= _amount, "Amount should be less than or equal to frozen tokens");
        _frozenTokens[_userAddress] = _frozenTokens[_userAddress] - (_amount);
        _emitPrivateTokensUnfrozen(_userAddress, _amount);
    }

    /**
     * @dev Internal function to determine if an address is authorized to view a balance
     * This implementation only owner or sender's identity are allowed to see balance. Can be overridden on derived contracts.
     * @param account The address to check authorization for
     * @return bool True if authorized, false otherwise
     */
    function _authorizeBalance(address account) internal view virtual returns (bool) {
        require(
            msg.sender == account || address(IIdentityRegistry(_tokenIdentityRegistry).identity(msg.sender)) == account, 
            "Unauthorized balance access"
        );
        return true;
    }

    /**
     * @dev Internal function to get the actual balance of an account
     * @param account The address to query the balance of
     * @return uint256 The actual balance of the account
     */
    function _balanceOf(address account) internal view returns (uint256) {
        return _balances[account];
    }

    /**
     *  @dev See {ERC20-_transfer}.
     */
    function _transfer(
        address _from,
        address _to,
        uint256 _amount
    ) internal virtual override {
        require(_from != address(0), "ERC20: transfer from the zero address");
        require(_to != address(0), "ERC20: transfer to the zero address");

        _beforeTokenTransfer(_from, _to, _amount);

        _balances[_from] = _balances[_from] - _amount;
        _balances[_to] = _balances[_to] + _amount;
        _emitPrivateTransfer(_from, _to, _amount);
    }

    /**
     *  @dev See {ERC20-_mint}.
     */
    function _mint(address _userAddress, uint256 _amount) internal virtual override {
        require(_userAddress != address(0), "ERC20: mint to the zero address");

        _beforeTokenTransfer(address(0), _userAddress, _amount);

        _totalSupply = _totalSupply + _amount;
        _balances[_userAddress] = _balances[_userAddress] + _amount;
        _emitPrivateTransfer(address(0), _userAddress, _amount);
    }

    /**
     *  @dev See {ERC20-_burn}.
     */
    function _burn(address _userAddress, uint256 _amount) internal virtual override {
        require(_userAddress != address(0), "ERC20: burn from the zero address");

        _beforeTokenTransfer(_userAddress, address(0), _amount);

        _balances[_userAddress] = _balances[_userAddress] - _amount;
        _totalSupply = _totalSupply - _amount;
        _emitPrivateTransfer(_userAddress, address(0), _amount);
    }

    /**
     *  @dev See {ERC20-_approve}.
     */
    function _approve(
        address _owner,
        address _spender,
        uint256 _amount
    ) internal virtual override {
        require(_owner != address(0), "ERC20: approve from the zero address");
        require(_spender != address(0), "ERC20: approve to the zero address");

        _allowances[_owner][_spender] = _amount;
        _emitPrivateApproval(_owner, _spender, _amount);
    }

    /**
     *  @dev Internal helper function to access the allowance mapping directly.
     */
    function _allowance(address owner, address spender) internal view returns (uint256) {
        return _allowances[owner][spender];
    }

    /**
     * @dev Internal function to emit private Transfer event
     */
    function _emitPrivateTransfer(address _from, address _to, uint256 _amount) internal {
        // Calculate exact size needed
        uint256 allowedViewersSize = 0;
        if (_from != address(0)) allowedViewersSize++;
        if (_to != address(0)) allowedViewersSize++;
        if (auditor != address(0)) allowedViewersSize++;
        
        // Create array with exact size
        address[] memory allowedViewers = new address[](allowedViewersSize);
        uint256 index = 0;
        
        // Add from address if not zero
        if (_from != address(0)) {
            allowedViewers[index] = _from;
            index++;
        }
        
        // Add to address if not zero
        if (_to != address(0)) {
            allowedViewers[index] = _to;
            index++;
        }
        
        // Add auditor if set
        if (auditor != address(0)) {
            allowedViewers[index] = auditor;
        }
        
        emit PrivateEvent(
            allowedViewers,
            EVENT_TYPE_TRANSFER,
            abi.encode(_from, _to, _amount)
        );
    }

    /**
     * @dev Internal function to emit private Approval event
     */
    function _emitPrivateApproval(address _owner, address _spender, uint256 _amount) internal {
        // Calculate exact size needed
        uint256 allowedViewersSize = 0;
        if (_owner != address(0)) allowedViewersSize++;
        if (_spender != address(0)) allowedViewersSize++;
        if (auditor != address(0)) allowedViewersSize++;
        
        // Create array with exact size
        address[] memory allowedViewers = new address[](allowedViewersSize);
        uint256 index = 0;
        
        // Add owner if not zero
        if (_owner != address(0)) {
            allowedViewers[index] = _owner;
            index++;
        }
        
        // Add spender if not zero
        if (_spender != address(0)) {
            allowedViewers[index] = _spender;
            index++;
        }
        
        // Add auditor if set
        if (auditor != address(0)) {
            allowedViewers[index] = auditor;
        }
        
        emit PrivateEvent(
            allowedViewers,
            EVENT_TYPE_APPROVAL,
            abi.encode(_owner, _spender, _amount)
        );
    }

    /**
     * @dev Internal function to emit private TokensFrozen event
     */
    function _emitPrivateTokensFrozen(address _user, uint256 _amount) internal {
        // Calculate exact size needed
        uint256 allowedViewersSize = 0;
        if (_user != address(0)) allowedViewersSize++;
        if (auditor != address(0)) allowedViewersSize++;
        
        // Create array with exact size
        address[] memory allowedViewers = new address[](allowedViewersSize);
        uint256 index = 0;
        
        // Add user if not zero
        if (_user != address(0)) {
            allowedViewers[index] = _user;
            index++;
        }
        
        // Add auditor if set
        if (auditor != address(0)) {
            allowedViewers[index] = auditor;
        }
        
        emit PrivateEvent(
            allowedViewers,
            EVENT_TYPE_TOKENS_FROZEN,
            abi.encode(_user, _amount)
        );
    }

    /**
     * @dev Internal function to emit private TokensUnfrozen event
     */
    function _emitPrivateTokensUnfrozen(address _user, uint256 _amount) internal {
        // Calculate exact size needed
        uint256 allowedViewersSize = 0;
        if (_user != address(0)) allowedViewersSize++;
        if (auditor != address(0)) allowedViewersSize++;
        
        // Create array with exact size
        address[] memory allowedViewers = new address[](allowedViewersSize);
        uint256 index = 0;
        
        // Add user if not zero
        if (_user != address(0)) {
            allowedViewers[index] = _user;
            index++;
        }
        
        // Add auditor if set
        if (auditor != address(0)) {
            allowedViewers[index] = auditor;
        }
        
        emit PrivateEvent(
            allowedViewers,
            EVENT_TYPE_TOKENS_UNFROZEN,
            abi.encode(_user, _amount)
        );
    }
}
