// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.2;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "multisig-wallet-contracts/contracts/IMultiSigWallet.sol";

import "./BIP20/BIP20DelegatedTransfer.sol";

contract LoyaltyToken is BIP20DelegatedTransfer {
    /*
     *  Storage
     */

    /*
     * Public functions
     */
    constructor(
        string memory name_,
        string memory symbol_,
        address account_,
        address feeAccount_
    ) BIP20DelegatedTransfer(name_, symbol_, account_, feeAccount_) {
        require(
            IMultiSigWallet(owner).supportsInterface(type(IMultiSigWallet).interfaceId),
            "LoyaltyToken: Invalid interface ID of multi sig wallet"
        );
    }

    function mint(uint256 amount) external onlyOwner {
        _mint(owner, amount);
    }
}
