import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import { ethers } from "hardhat";

import { HardhatAccount } from "../src/HardhatAccount";
import { LYT, MultiSigWallet, MultiSigWalletFactory } from "../typechain-types";

import assert from "assert";
import { BigNumber, Wallet } from "ethers";
import { ContractUtils } from "../src/utils/ContractUtils";

import { expect } from "chai";
import { BOACoin } from "../src/utils/Amount";

async function deployMultiSigWalletFactory(deployer: Wallet): Promise<MultiSigWalletFactory> {
    const factory = await ethers.getContractFactory("MultiSigWalletFactory");
    const contract = (await factory.connect(deployer).deploy()) as MultiSigWalletFactory;
    await contract.deployed();
    await contract.deployTransaction.wait();
    return contract;
}

async function deployMultiSigWallet(
    factoryAddress: string,
    deployer: Wallet,
    owners: string[],
    required: number
): Promise<MultiSigWallet | undefined> {
    const contractFactory = await ethers.getContractFactory("MultiSigWalletFactory");
    const factoryContract = contractFactory.attach(factoryAddress) as MultiSigWalletFactory;

    const address = await ContractUtils.getEventValueString(
        await factoryContract.connect(deployer).create("", "", owners, required),
        factoryContract.interface,
        "ContractInstantiation",
        "wallet"
    );

    return address !== undefined
        ? ((await ethers.getContractFactory("MultiSigWallet")).attach(address) as MultiSigWallet)
        : undefined;
}

async function deployToken(deployer: Wallet, owner: string): Promise<LYT> {
    const factory = await ethers.getContractFactory("LYT");
    const contract = (await factory.connect(deployer).deploy(owner)) as LYT;
    await contract.deployed();
    await contract.deployTransaction.wait();
    return contract;
}

describe("Test for LYT token", () => {
    const raws = HardhatAccount.keys.map((m) => new Wallet(m, ethers.provider));
    const [deployer, account0, account1, account2, account3, account4, account5] = raws;
    const owners1 = [account0, account1, account2];

    let multiSigFactory: MultiSigWalletFactory;
    let multiSigWallet: MultiSigWallet | undefined;
    let token: LYT;
    const requiredConfirmations = 2;

    before(async () => {
        multiSigFactory = await deployMultiSigWalletFactory(deployer);
        assert.ok(multiSigFactory);
    });

    it("Create Wallet by Factory", async () => {
        multiSigWallet = await deployMultiSigWallet(
            multiSigFactory.address,
            deployer,
            owners1.map((m) => m.address),
            requiredConfirmations
        );
        assert.ok(multiSigWallet);

        assert.deepStrictEqual(
            await multiSigWallet.getMembers(),
            owners1.map((m) => m.address)
        );

        assert.deepStrictEqual(await multiSigFactory.getNumberOfWalletsForMember(account0.address), BigNumber.from(1));
        assert.deepStrictEqual(await multiSigFactory.getNumberOfWalletsForMember(account1.address), BigNumber.from(1));
        assert.deepStrictEqual(await multiSigFactory.getNumberOfWalletsForMember(account2.address), BigNumber.from(1));
    });

    it("Create Token, Owner is MultiSigWallet", async () => {
        assert.ok(multiSigWallet);

        token = await deployToken(deployer, multiSigWallet.address);
        assert.deepStrictEqual(await token.getOwner(), multiSigWallet.address);
        assert.deepStrictEqual(await token.balanceOf(multiSigWallet.address), BigNumber.from(0));
    });

    it("mint initial supply", async () => {
        assert.ok(multiSigWallet);
        assert.ok(token);

        const initialSupply = BigNumber.from(10).pow(BigNumber.from(28));

        const mintEncoded = token.interface.encodeFunctionData("mint", [initialSupply]);

        const transactionId = await ContractUtils.getEventValueBigNumber(
            await multiSigWallet
                .connect(account0)
                .submitTransaction("title", "description", token.address, 0, mintEncoded),
            multiSigWallet.interface,
            "Submission",
            "transactionId"
        );
        assert.ok(transactionId !== undefined);

        const executedTransactionId = await ContractUtils.getEventValueBigNumber(
            await multiSigWallet.connect(account1).confirmTransaction(transactionId),
            multiSigWallet.interface,
            "Execution",
            "transactionId"
        );

        // Check that transaction has been executed
        assert.deepStrictEqual(transactionId, executedTransactionId);

        // Check balance of target
        assert.deepStrictEqual(await token.balanceOf(multiSigWallet.address), initialSupply);
    });

    it("Transfer to account4", async () => {
        assert.ok(multiSigWallet);
        assert.ok(token);

        const amount = BOACoin.make(1000).value;

        const mintEncoded = token.interface.encodeFunctionData("transfer", [account4.address, amount]);

        const transactionId = await ContractUtils.getEventValueBigNumber(
            await multiSigWallet
                .connect(account0)
                .submitTransaction("Transfer", "Transfer to account4", token.address, 0, mintEncoded),
            multiSigWallet.interface,
            "Submission",
            "transactionId"
        );
        assert.ok(transactionId !== undefined);

        const executedTransactionId = await ContractUtils.getEventValueBigNumber(
            await multiSigWallet.connect(account1).confirmTransaction(transactionId),
            multiSigWallet.interface,
            "Execution",
            "transactionId"
        );

        // Check that transaction has been executed
        assert.deepStrictEqual(transactionId, executedTransactionId);

        // Check balance of target
        assert.deepStrictEqual(await token.balanceOf(account4.address), amount);
    });

    it("Transfer from account4 to account5 - Invalid Signature", async () => {
        const amount = BOACoin.make(500).value;
        const nonce = await token.nonceOf(account4.address);
        const message = ContractUtils.getTransferMessage(
            ethers.provider.network.chainId,
            token.address,
            account4.address,
            account5.address,
            amount,
            nonce
        );
        const signature = ContractUtils.signMessage(account3, message);
        await expect(token.delegatedTransfer(account4.address, account5.address, amount, signature)).to.be.revertedWith(
            "Invalid signature"
        );
    });

    it("Transfer from account4 to account5", async () => {
        const amount = BOACoin.make(500).value;
        const nonce = await token.nonceOf(account4.address);
        const message = ContractUtils.getTransferMessage(
            ethers.provider.network.chainId,
            token.address,
            account4.address,
            account5.address,
            amount,
            nonce
        );
        const signature = ContractUtils.signMessage(account4, message);
        await token.delegatedTransfer(account4.address, account5.address, amount, signature);

        assert.deepStrictEqual(await token.balanceOf(account5.address), amount);
    });
});
