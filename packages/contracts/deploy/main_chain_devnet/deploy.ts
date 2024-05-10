import "@nomiclabs/hardhat-ethers";
import { ethers } from "hardhat";

import { HardhatAccount } from "../../src/HardhatAccount";
import { BOACoin } from "../../src/utils/Amount";
import { LYT, MultiSigWallet } from "../../typechain-types";

import { BaseContract, Wallet } from "ethers";

import fs from "fs";

interface IDeployedContract {
    name: string;
    address: string;
    contract: BaseContract;
}

interface IAccount {
    deployer: Wallet;
}

type FnDeployer = (accounts: IAccount, deployment: Deployments) => void;

class Deployments {
    public deployments: Map<string, IDeployedContract>;
    public deployers: FnDeployer[];
    public accounts: IAccount;

    public ownersOfMultiSigWallet: string[] = [
        "0x2312c098Cef41C0F55350bC3Ad8F4AFf983d9432",
        "0x5AD84fF1bD71cDEa7C3083706F2D1232a453C604",
        "0x9630fF452211Cc95BBFa32c0C4cF68eB498b8549",
    ];
    public requiredMultiSigWallet: number = 2;

    constructor() {
        this.deployments = new Map<string, IDeployedContract>();
        this.deployers = [];

        const raws = HardhatAccount.keys.map((m) => new Wallet(m, ethers.provider));
        const [deployer] = raws;

        this.accounts = {
            deployer,
        };
    }

    public addContract(name: string, address: string, contract: BaseContract) {
        this.deployments.set(name, {
            name,
            address,
            contract,
        });
    }

    public getContract(name: string): BaseContract | undefined {
        const info = this.deployments.get(name);
        if (info !== undefined) {
            return info.contract;
        } else {
            return undefined;
        }
    }

    public getContractAddress(name: string): string | undefined {
        const info = this.deployments.get(name);
        if (info !== undefined) {
            return info.address;
        } else {
            return undefined;
        }
    }

    public addDeployer(deployer: FnDeployer) {
        this.deployers.push(deployer);
    }

    public async doDeploy() {
        for (const elem of this.deployers) {
            try {
                await elem(this.accounts, this);
            } catch (error) {
                console.log(error);
            }
        }
    }

    static filename = "./deploy/main_chain_devnet/deployed_contracts.json";

    public async loadContractInfo() {
        if (!fs.existsSync(Deployments.filename)) return;

        const data: any = JSON.parse(fs.readFileSync(Deployments.filename, "utf-8"));

        for (const key of Object.keys(data)) {
            const name = key;
            const address = data[key];
            console.log(`Load ${name} - ${address}...`);
            this.deployments.set(key, {
                name,
                address,
                contract: (await ethers.getContractFactory(name)).attach(address),
            });
        }
    }

    public saveContractInfo() {
        const contents: any = {};
        for (const key of this.deployments.keys()) {
            const item = this.deployments.get(key);
            if (item !== undefined) {
                contents[key] = item.address;
            }
        }
        fs.writeFileSync(Deployments.filename, JSON.stringify(contents), "utf-8");
    }
}

async function deployMultiSigWallet(accounts: IAccount, deployment: Deployments) {
    const contractName = "MultiSigWallet";
    console.log(`Deploy ${contractName}...`);

    const factory = await ethers.getContractFactory("MultiSigWallet");
    const contract = (await factory
        .connect(accounts.deployer)
        .deploy(
            "OwnerWallet",
            "",
            deployment.ownersOfMultiSigWallet,
            deployment.requiredMultiSigWallet
        )) as MultiSigWallet;
    await contract.deployed();
    await contract.deployTransaction.wait();

    const owners = await contract.getMembers();
    for (let idx = 0; idx < owners.length; idx++) {
        console.log(`MultiSigWallet's owners[${idx}]: ${owners[idx]}`);
    }

    deployment.addContract(contractName, contract.address, contract);
    console.log(`Deployed ${contractName} to ${contract.address}`);
}

async function deployToken(accounts: IAccount, deployment: Deployments) {
    const contractName = "LYT";
    console.log(`Deploy ${contractName}...`);
    if (deployment.getContract("MultiSigWallet") === undefined) {
        console.error("Contract is not deployed!");
        return;
    }

    const factory = await ethers.getContractFactory("LYT");
    const contract = (await factory
        .connect(accounts.deployer)
        .deploy(deployment.getContractAddress("MultiSigWallet"))) as LYT;
    await contract.deployed();
    await contract.deployTransaction.wait();

    const owner = await contract.getOwner();
    const balance = await contract.balanceOf(owner);
    console.log(`LYT token's owner: ${owner}`);
    console.log(`LYT token's balance of owner: ${new BOACoin(balance).toDisplayString(true, 2)}`);

    deployment.addContract(contractName, contract.address, contract);
    console.log(`Deployed ${contractName} to ${contract.address}`);
}

async function main() {
    const deployments = new Deployments();

    deployments.addDeployer(deployMultiSigWallet);
    deployments.addDeployer(deployToken);

    await deployments.loadContractInfo();

    await deployments.doDeploy();

    deployments.saveContractInfo();
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
