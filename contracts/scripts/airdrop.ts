// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import "@nomiclabs/hardhat-ethers";
import * as dotenv from "dotenv";
import { ethers } from "hardhat";
import prompts from "prompts";
import fs from "fs";
import path from "path";
import * as IPFS from "ipfs-core";
// eslint-disable-next-line camelcase
import { HitchhikerLE__factory } from "../typechain";
import { merkleRoot } from "../utils/merkle-tree";

dotenv.config();

async function main() {
  const [account] = await ethers.getSigners();
  console.log("Deployer address: ", account.address);
  if (!account) {
    throw Error("Please configure PRIVATE_KEY at the .env file.");
  }
  const response0 = await prompts({
    type: "text",
    name: "contract",
    message: `Please enter the Hitchihiker LE contract address. You can configure HITCHHIKER_LE at the .env file.`,
    initial: process.env.HITCHHIKER_LE,
  });
  const address = response0.contract as string;
  if (!ethers.utils.isAddress(address)) {
    throw Error("Invalid contract address");
  }
  const hhLE = new HitchhikerLE__factory(account).attach(address);
  const AIRDROP_DIR = "./airdrops";
  const METADATA_DIR = "./metadata";
  const airdrops = fs.readdirSync(AIRDROP_DIR);
  console.log("Fetching data from Ethereum");
  const registered: string[] = [];
  for (const filename of airdrops) {
    const tokenId = Number.parseInt(path.basename(filename, ".json"));
    console.log(tokenId);
    const exist = await hhLE.exists(tokenId);
    if (exist) registered.push(filename);
  }
  const response = await prompts({
    type: "select",
    name: "filename",
    message: "Pick a metadata to register",
    choices: [
      ...airdrops.map((filename) => ({
        title: filename,
        disabled: registered.includes(filename),
        value: filename,
      })),
      {
        title: "Quit",
        value: "quit",
      },
    ],
  });
  const metadata = fs.readFileSync(`${METADATA_DIR}/${response.filename}`);
  const ipfs = await IPFS.create();
  const result = await ipfs.add(metadata);
  console.log("Metadata IPFS Hash:", result.path);
  console.log("Metadata:");
  console.log(metadata.toString());
  console.log(`Make sure that ${result.path} is pinned.`);
  await ipfs.stop();
  const airdropData = JSON.parse(
    fs.readFileSync(`${AIRDROP_DIR}/${response.filename}`).toString()
  );
  const dateResponse = await prompts({
    type: "date",
    name: "timestamp",
    message: "Set up the airdrop claim due date:",
  });
  const timestamp = Math.floor(
    new Date(dateResponse.timestamp).getTime() / 1000
  );
  console.log("Timestamp: ", timestamp);
  const leaves = Object.keys(airdropData).map((key) => ({
    address: key,
    amount: airdropData[key] as number,
  }));
  const airdropRoot = merkleRoot(leaves);
  const tx = await hhLE.newAirdrop(
    `ipfs://${result.path}`,
    airdropRoot,
    timestamp
  );
  console.log("Submitted a transaction: ", tx.hash);
  await tx.wait();
  console.log("Tx is confirmed.");
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
