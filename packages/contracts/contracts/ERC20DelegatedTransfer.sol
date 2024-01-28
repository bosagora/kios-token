// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "multisig-wallet-contracts/contracts/IMultiSigWallet.sol";

import "./IERC20DelegatedTransfer.sol";

contract ERC20DelegatedTransfer is ERC20, IERC20DelegatedTransfer {
    /*
     *  Storage
     */
    mapping(address => uint256) internal nonce;

    /*
     * Public functions
     */
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    function nonceOf(address account) external view override returns (uint256) {
        return nonce[account];
    }

    function delegatedTransfer(
        address from,
        address to,
        uint256 amount,
        bytes calldata signature
    ) external override returns (bool) {
        bytes32 dataHash = keccak256(abi.encode(from, to, amount, nonce[from]));
        require(ECDSA.recover(ECDSA.toEthSignedMessageHash(dataHash), signature) == from, "Invalid signature");

        super._transfer(from, to, amount);
        nonce[from]++;
        return true;
    }
}
