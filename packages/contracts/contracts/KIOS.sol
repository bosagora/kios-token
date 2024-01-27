// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "multisig-wallet-contracts/contracts/IMultiSigWallet.sol";

import "./IERC20DelegatedTransfer.sol";

contract KIOS is ERC20, IERC20DelegatedTransfer {
    /*
     *  Storage
     */
    address internal owner;
    mapping(address => uint256) internal nonce;

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
    constructor(address account) ERC20("KIOS", "KIOS") {
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
