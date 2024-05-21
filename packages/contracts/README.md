# Introduction

This project contains the smart contract source code of the loyalty token(LYT)

## WhitePaper

- [English](docs%2FLYT_TokenWhitePaper_EN.pdf)
- [Korean](docs%2FLYT_TokenWhitePaper_KO.pdf)

## Install NodeJS

https://nodejs.org/en/download

## Install yarn

```shell
npm install -g yarn
```

## Install Project

```shell
git clone https://github.com/bosagora/loyalty-tokens.git
cd loyalty-tokens
yarn install
```

## Test Project

```shell
cd packages/contracts
cp -r env/.env.sample env/.env
yarn run test
```
