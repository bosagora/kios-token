// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.2;

import "./LoyaltyToken.sol";

contract KIOS is LoyaltyToken {
    /*
     * Public functions
     */
    constructor(address account_) LoyaltyToken("KIOS", "KIOS", account_, 1e10 * 1e18) {}
}
