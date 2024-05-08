// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.2;

import "./LoyaltyToken.sol";

contract LYT is LoyaltyToken {
    /*
     * Public functions
     */
    constructor(address account_) LoyaltyToken("Loyalty Coin", "LYT", account_) {}
}
