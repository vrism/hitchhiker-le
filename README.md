# Hitchhiker LE

Expected node version is >= 16.0.0

## Install and build

```shell
yarn
yarn build
```

## Run unit test

```shell
yarn workspace contracts test
```

## Deploy test in local env

```shell
# in terminal 1
yarn workspace contracts hardhat node
```

```shell
# in terminal 2
yarn workspace contracts hardhat run scripts/deploy.ts --network localhost
yarn workspace contracts hardhat run scripts/airdrop.ts --network localhost
```

## Test w/ UI

Please implement more details

```shell
# in terminal 1
yarn build && yarn develop
```

```shell
# in terminal 2
yarn workspace contracts hardhat run scripts/deploy.ts --network localhost
yarn workspace contracts hardhat run scripts/airdrop.ts --network localhost
```

## Deploy

1. Prepare the airdrop list and create `{id}.json` file at the `./airdrops` directory.
2. Prepare the metadata and create `{id}.json` file at the `./metadata` directory.
3. Upload the image and metadata to the IPFS and pin them.
4. Configure `contracts/.env` file. Please see `contracts/.env.example` for its example.
5. Run following commands
    ```
    yarn workspace contracts hardhat run scripts/deploy.ts --network mainnet
    yarn workspace contracts hardhat run scripts/airdrop.ts --network mainnet
    ```