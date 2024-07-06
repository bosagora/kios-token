// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.2;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "multisig-wallet-contracts/contracts/IMultiSigWallet.sol";

import "./BIP20/BIP20DelegatedTransfer.sol";

contract LoyaltyToken is BIP20DelegatedTransfer {
    /*
     *  Storage
     */
    address internal owner;

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
    ) BIP20DelegatedTransfer(name_, symbol_) {
        owner = account_;
        protocolFeeAccount = feeAccount_;
        protocolFee = 1e17;
        require(
            IMultiSigWallet(owner).supportsInterface(type(IMultiSigWallet).interfaceId),
            "LoyaltyToken: Invalid interface ID of multi sig wallet"
        );
    }

    function mint(uint256 amount) external onlyOwner {
        _mint(owner, amount);
    }

    function getOwner() external view returns (address) {
        return owner;
    }

    function getProtocolFee() external view returns (uint256) {
        return protocolFee;
    }

    function changeProtocolFee(uint256 _protocolFee) external {
        require(msg.sender == owner, "LoyaltyToken: Sender is not authorized to execute.");
        require(_protocolFee <= MAX_PROTOCOL_FEE, "LoyaltyToken: The value entered is not an appropriate value.");
        protocolFee = _protocolFee;
    }

    function changeProtocolFeeAccount(address _account) external {
        require(msg.sender == protocolFeeAccount, "LoyaltyToken: Sender is not authorized to execute.");

        protocolFeeAccount = _account;
    }

    function delegatedTransferWithFee(
        address from,
        address to,
        uint256 amount,
        uint256 expiry,
        bytes calldata signature
    ) external returns (bool) {
        bytes32 dataHash = keccak256(abi.encode(block.chainid, address(this), from, to, amount, nonce[from], expiry));
        require(
            ECDSA.recover(ECDSA.toEthSignedMessageHash(dataHash), signature) == from,
            "LoyaltyToken: Invalid signature"
        );
        require(expiry > block.timestamp, "LoyaltyToken: Expired signature");

        require(amount > protocolFee, "LoyaltyToken: The amount should be greater than the fee.");
        require(balanceOf(from) >= amount, "LoyaltyToken: transfer amount exceeds balance");
        super._transfer(from, to, amount - protocolFee);
        super._transfer(from, protocolFeeAccount, protocolFee);
        nonce[from]++;
        return true;
    }
}
