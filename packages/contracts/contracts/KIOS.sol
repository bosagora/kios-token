// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "multisig-wallet-contracts/contracts/IMultiSigWallet.sol";

contract KIOS is ERC20 {
    address internal owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can execute");
        _;
    }

    constructor(address _owner) ERC20("KIOS", "KIOS") {
        owner = _owner;
        require(
            IMultiSigWallet(owner).supportsInterface(type(IMultiSigWallet).interfaceId),
            "Invalid interface ID of multi sig wallet"
        );
        _mint(owner, 1e10 * 1e18);
    }

    function mint(address _account, uint256 _amount) external onlyOwner {
        _mint(_account, _amount);
    }

    function getOwner() external view returns (address) {
        return owner;
    }
}
