// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.2;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "multisig-wallet-contracts/contracts/IMultiSigWallet.sol";

import "./ServiceToken.sol";

contract PNB is ServiceToken {
    /*
     * Public functions
     */
    constructor(address account_) ServiceToken("PNB", "PNB", account_, 1e10 * 1e18) {}
}
