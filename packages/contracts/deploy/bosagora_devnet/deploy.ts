import "@nomiclabs/hardhat-ethers";
import { ethers } from "hardhat";

import { HardhatAccount } from "../../src/HardhatAccount";
import { KIOS, MultiSigWallet, MultiSigWalletFactory } from "../../typechain-types";

import { BaseContract, Contract, Wallet } from "ethers";

import fs from "fs";
import { ContractUtils } from "../../src/utils/ContractUtils";
import { BOACoin } from "../../src/utils/Amount";

const network = "bosagora_devnet";

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

    static filename = "./deploy/bosagora_devnet/deployed_contracts.json";

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

async function deployMultiSigWalletFactory(accounts: IAccount, deployment: Deployments) {
    const contractName = "MultiSigWalletFactory";
    console.log(`Deploy ${contractName}...`);
    const factory = await ethers.getContractFactory("MultiSigWalletFactory");
    const contract = (await factory.connect(accounts.deployer).deploy()) as MultiSigWalletFactory;
    await contract.deployed();
    await contract.deployTransaction.wait();

    deployment.addContract(contractName, contract.address, contract);
    console.log(`Deployed ${contractName} to ${contract.address}`);
}

async function deployMultiSigWallet(accounts: IAccount, deployment: Deployments): Promise<MultiSigWallet | undefined> {
    const contractName = "MultiSigWallet";
    console.log(`Deploy ${contractName}...`);
    if (deployment.getContract("MultiSigWalletFactory") === undefined) {
        console.error("Contract is not deployed!");
        return;
    }

    const factoryContract = deployment.getContract("MultiSigWalletFactory") as MultiSigWalletFactory;

    const address = await ContractUtils.getEventValueString(
        await factoryContract
            .connect(accounts.deployer)
            .create(deployment.ownersOfMultiSigWallet, deployment.requiredMultiSigWallet),
        factoryContract.interface,
        "ContractInstantiation",
        "wallet"
    );

    if (address !== undefined) {
        const contract = (await ethers.getContractFactory("MultiSigWallet")).attach(address) as MultiSigWallet;

        const owners = await contract.getOwners();
        for (let idx = 0; idx < owners.length; idx++) {
            console.log(`MultiSigWallet's owners[${idx}]: ${owners[idx]}`);
        }

        deployment.addContract(contractName, contract.address, contract);
        console.log(`Deployed ${contractName} to ${contract.address}`);
    } else {
        console.error(`Failed to deploy ${contractName}`);
    }
}

async function deployToken(accounts: IAccount, deployment: Deployments) {
    const contractName = "KIOS";
    console.log(`Deploy ${contractName}...`);
    if (deployment.getContract("MultiSigWallet") === undefined) {
        console.error("Contract is not deployed!");
        return;
    }

    const factory = await ethers.getContractFactory("KIOS");
    const contract = (await factory
        .connect(accounts.deployer)
        .deploy(deployment.getContractAddress("MultiSigWallet"))) as KIOS;
    await contract.deployed();
    await contract.deployTransaction.wait();

    const owner = await contract.getOwner();
    const balance = await contract.balanceOf(owner);
    console.log(`KIOS token's owner: ${owner}`);
    console.log(`KIOS token's balance of owner: ${new BOACoin(balance).toDisplayString(true, 2)}`);

    deployment.addContract(contractName, contract.address, contract);
    console.log(`Deployed ${contractName} to ${contract.address}`);
}

async function main() {
    const deployments = new Deployments();

    deployments.addDeployer(deployMultiSigWalletFactory);
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
