// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.2;

import "./IBIP20.sol";

interface IBIP20DelegatedTransfer is IBIP20 {
    function nonceOf(address account) external view returns (uint256);
    function delegatedTransfer(
        address from,
        address to,
        uint256 amount,
        uint256 expiry,
        bytes calldata signature
    ) external returns (bool);
}
