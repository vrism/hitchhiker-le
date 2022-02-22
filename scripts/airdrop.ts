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
// import * as IPFS from "ipfs-core";
import pinataSDK from "@pinata/sdk";
// eslint-disable-next-line camelcase
import { HitchhikerLE__factory } from "../typechain";
import { merkleRoot } from "../utils/merkle-tree";
import { LedgerSigner } from "@anders-t/ethers-ledger";

dotenv.config();

const pinata = pinataSDK(
  process.env.PINATA_API_KEY || "",
  process.env.PINATA_API_SECRET || ""
);

async function main() {
  const ledger = new LedgerSigner(ethers.provider);
  console.log("Deployer address: ", ledger.getAddress());
  if (!ledger) {
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
  const hhLE = new HitchhikerLE__factory(ledger).attach(address);
  const AIRDROP_DIR = "./airdrops";
  const METADATA_DIR = "./metadata";
  const ASSET_DIR = "./assets";
  const airdrops = fs.readdirSync(AIRDROP_DIR);
  const assetsDir = fs.readdirSync(ASSET_DIR);
  console.log("Fetching data from Ethereum");
  const registered: string[] = [];
  for (const filename of airdrops) {
    const tokenId = Number.parseInt(path.basename(filename, ".json"));
    console.log(tokenId);
    const exist = await hhLE.exists(tokenId);
    let uri: boolean = false;
    try {
      console.log(await hhLE.uri(tokenId));
      uri = true;
    } catch (e: any) {
      const outOfBounds = e.toString().indexOf("out-of-bounds") > -1;
      if (outOfBounds) uri = false;
    }
    if (exist || uri) registered.push(filename);
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
  const metadata = JSON.parse(
    fs.readFileSync(`${METADATA_DIR}/${response.filename}`).toString()
  );
  const assets: string[] = [];

  for (const filename of assetsDir) {
    const tokenId = Number.parseInt(filename.split(".")[0]);
    const num = Number.parseInt(path.basename(response.filename, ".json"));

    if (tokenId === num) assets.push(filename);
  }

  if (assets.length !== 1) throw Error("Asset must be only one.");

  const readableStreamForAsset = fs.createReadStream(
    `${ASSET_DIR}/${assets[0]}`
  );

  const result0 = await pinata.pinFileToIPFS(readableStreamForAsset, {
    pinataMetadata: {
      name: assets[0],
    },
    pinataOptions: {
      cidVersion: 0,
    },
  });

  console.log("Asset Hash: ");
  console.log(result0.IpfsHash);

  metadata.animation_url = "ipfs://" + result0.IpfsHash;

  console.log("Metadata:");
  console.log(metadata);

  console.log("Write updated metadata...");
  fs.writeFileSync(
    `${METADATA_DIR}/${response.filename}`,
    JSON.stringify(metadata, null, 2)
  );
  console.log("ok");

  const result = await pinata.pinJSONToIPFS(metadata, {
    pinataMetadata: {
      name: response.filename,
    },
    pinataOptions: {
      cidVersion: 0,
    },
  });

  console.log(`Pinned ${result.IpfsHash}`);
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
    `ipfs://${result.IpfsHash}`,
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
