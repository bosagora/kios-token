import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "solidity-docgen";

import * as dotenv from "dotenv";
import { Wallet } from "ethers";
import { HardhatAccount } from "./src/HardhatAccount";

dotenv.config({ path: "env/.env" });

function getAccounts() {
    const accounts: string[] = [];
    const reg_bytes64: RegExp = /^(0x)[0-9a-f]{64}$/i;
    if (
        process.env.DEPLOYER !== undefined &&
        process.env.DEPLOYER.trim() !== "" &&
        reg_bytes64.test(process.env.DEPLOYER)
    ) {
        accounts.push(process.env.DEPLOYER);
    } else {
        process.env.DEPLOYER = Wallet.createRandom().privateKey;
        accounts.push(process.env.DEPLOYER);
    }

    if (
        process.env.PROTOCOL_FEE !== undefined &&
        process.env.PROTOCOL_FEE.trim() !== "" &&
        reg_bytes64.test(process.env.PROTOCOL_FEE)
    ) {
        accounts.push(process.env.PROTOCOL_FEE);
    } else {
        process.env.PROTOCOL_FEE = Wallet.createRandom().privateKey;
        accounts.push(process.env.PROTOCOL_FEE);
    }

    while (accounts.length < 50) {
        accounts.push(Wallet.createRandom().privateKey);
    }

    if (HardhatAccount.keys.length === 0) {
        for (const account of accounts) {
            HardhatAccount.keys.push(account);
        }
    }

    return accounts;
}

function getTestAccounts() {
    const defaultBalance = "2000000000000000000000000";
    const acc = getAccounts();
    return acc.map((m) => {
        return {
            privateKey: m,
            balance: defaultBalance,
        };
    });
}

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config = {
    solidity: {
        compilers: [
            {
                version: "0.8.2",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 2000,
                    },
                },
            },
        ],
    },
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            accounts: getTestAccounts(),
            gas: 8000000,
            gasPrice: 8000000000,
            blockGasLimit: 8000000,
        },
        bosagora_mainnet: {
            url: process.env.MAIN_NET_URL || "",
            chainId: 2151,
            accounts: getAccounts(),
        },
        bosagora_testnet: {
            url: process.env.TEST_NET_URL || "",
            chainId: 2019,
            accounts: getAccounts(),
        },
        main_chain_devnet: {
            url: "http://localhost:8540",
            chainId: 24600,
            accounts: getAccounts(),
        },
        side_chain_devnet: {
            url: "http://localhost:8545",
            chainId: 24680,
            accounts: getAccounts(),
        },
    },
    gasReporter: {
        enabled: process.env.REPORT_GAS !== undefined,
        currency: "USD",
    },
};

export default config;
