// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.2;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "./BIP20.sol";
import "./IBIP20DelegatedTransfer.sol";

contract BIP20DelegatedTransfer is BIP20, IBIP20DelegatedTransfer {
    /*
     *  Storage
     */
    address internal owner;

    mapping(address => uint256) internal nonce;

    address public protocolFeeAccount;

    uint256 internal protocolFee;

    uint256 public constant MAX_PROTOCOL_FEE = 5e18;

    /*
     *  Modifiers
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can execute");
        _;
    }

    /*
     * Public functions
     */
    constructor(
        string memory name_,
        string memory symbol_,
        address account_,
        address feeAccount_
    ) BIP20(name_, symbol_) {
        owner = account_;
        protocolFeeAccount = feeAccount_;
        protocolFee = 1e17;
    }

    function getOwner() external view override returns (address) {
        return owner;
    }

    function nonceOf(address account) external view override returns (uint256) {
        return nonce[account];
    }

    function delegatedTransfer(
        address from,
        address to,
        uint256 amount,
        uint256 expiry,
        bytes calldata signature
    ) external override returns (bool) {
        bytes32 dataHash = keccak256(abi.encode(block.chainid, address(this), from, to, amount, nonce[from], expiry));
        require(
            ECDSA.recover(ECDSA.toEthSignedMessageHash(dataHash), signature) == from,
            "BIP20DelegatedTransfer: Invalid signature"
        );
        require(expiry > block.timestamp, "BIP20DelegatedTransfer: Expired signature");

        super._transfer(from, to, amount);
        nonce[from]++;
        return true;
    }

    function getProtocolFee() external view override returns (uint256) {
        return protocolFee;
    }

    function changeProtocolFee(uint256 _protocolFee) external override {
        require(msg.sender == owner, "BIP20DelegatedTransfer: Sender is not authorized to execute.");
        require(
            _protocolFee <= BIP20DelegatedTransfer.MAX_PROTOCOL_FEE,
            "LoyaltyToken: The value entered is not an appropriate value."
        );
        protocolFee = _protocolFee;
    }

    function changeProtocolFeeAccount(address _account) external override {
        require(msg.sender == protocolFeeAccount, "BIP20DelegatedTransfer: Sender is not authorized to execute.");

        protocolFeeAccount = _account;
    }

    function delegatedTransferWithFee(
        address from,
        address to,
        uint256 amount,
        uint256 expiry,
        bytes calldata signature
    ) external override returns (bool) {
        bytes32 dataHash = keccak256(abi.encode(block.chainid, address(this), from, to, amount, nonce[from], expiry));
        require(
            ECDSA.recover(ECDSA.toEthSignedMessageHash(dataHash), signature) == from,
            "BIP20DelegatedTransfer: Invalid signature"
        );
        require(expiry > block.timestamp, "BIP20DelegatedTransfer: Expired signature");

        require(amount > protocolFee, "BIP20DelegatedTransfer: The amount should be greater than the fee.");
        require(balanceOf(from) >= amount, "BIP20DelegatedTransfer: transfer amount exceeds balance");
        super._transfer(from, to, amount - protocolFee);
        super._transfer(from, protocolFeeAccount, protocolFee);
        nonce[from]++;
        return true;
    }
}
