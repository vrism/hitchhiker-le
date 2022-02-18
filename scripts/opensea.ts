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
import * as IPFS from "ipfs-core";
// eslint-disable-next-line camelcase
import { HitchhikerLE__factory } from "../typechain";

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
  const CONTRACT_METADATA = "./metadata/contract.json";
  const contractMetadata = fs.readFileSync(CONTRACT_METADATA);
  const ipfs = await IPFS.create();
  const result = await ipfs.add(contractMetadata);
  console.log("Contract Metadata IPFS Hash:", result.path);
  console.log("Metadata:");
  console.log(contractMetadata.toString());
  console.log(`Make sure that ${result.path} is pinned.`);
  await ipfs.stop();
  const response = await prompts({
    type: "confirm",
    name: "confirm",
    message: "Will you update the contract URI?",
  });
  if (response.confirm) {
    const tx = await hhLE.updateContractURI(`ipfs://${result.path}`);
    console.log("Submitted a update transaction: ", tx.hash);
    await tx.wait();
    console.log("Tx is confirmed.");
  }
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
