// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "multisig-wallet-contracts/contracts/IMultiSigWallet.sol";

import "./ERC20DelegatedTransfer.sol";

contract KIOS is ERC20DelegatedTransfer {
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
    constructor(address account) ERC20DelegatedTransfer("KIOS", "KIOS") {
        owner = account;
        require(
            IMultiSigWallet(owner).supportsInterface(type(IMultiSigWallet).interfaceId),
            "Invalid interface ID of multi sig wallet"
        );
        _mint(owner, 1e10 * 1e18);
    }

    function mint(address account, uint256 amount) external onlyOwner {
        _mint(account, amount);
    }

    function getOwner() external view returns (address) {
        return owner;
    }
}
