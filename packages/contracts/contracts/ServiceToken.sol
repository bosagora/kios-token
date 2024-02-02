// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.2;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "multisig-wallet-contracts/contracts/IMultiSigWallet.sol";

import "./BIP20/BIP20DelegatedTransfer.sol";

contract ServiceToken is BIP20DelegatedTransfer {
    /*
     *  Storage
     */
    address internal owner;

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
        uint256 initialSupply_
    ) BIP20DelegatedTransfer(name_, symbol_) {
        owner = account_;
        require(
            IMultiSigWallet(owner).supportsInterface(type(IMultiSigWallet).interfaceId),
            "Invalid interface ID of multi sig wallet"
        );
        _mint(owner, initialSupply_);
    }

    function mint(address account, uint256 amount) external onlyOwner {
        _mint(account, amount);
    }

    function getOwner() external view returns (address) {
        return owner;
    }
}
