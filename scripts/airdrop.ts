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
import pinataSDK from "@pinata/sdk";
// eslint-disable-next-line camelcase
import { TestnetLE__factory } from "../typechain";
import { merkleRoot } from "../utils/merkle-tree";

dotenv.config();

const pinata = pinataSDK(
  process.env.PINATA_API_KEY || "",
  process.env.PINATA_API_SECRET || ""
);

async function main() {
  // 계정 정보 확인
  const [ account ] = await ethers.getSigners();
  console.log("Deployer address: ", await account.getAddress());
  if (!account) {
    throw Error("Please configure PRIVATE_KEY at the .env file.");
  }
  // 컨트랙트 주소 확인
  const response0 = await prompts({
    type: "text",
    name: "contract",
    message: `Please enter the Testnet LE contract address. You can configure TESTNET_LE at the .env file.`,
    initial: process.env.TESTNET_LE,
  });
  const address = response0.contract as string;
  if (!ethers.utils.isAddress(address)) {
    throw Error("Invalid contract address");
  }

  const tnLE = new TestnetLE__factory(account).attach(address);
  const AIRDROP_DIR = "./airdrops";
  const METADATA_DIR = "./metadata";
  const ASSET_DIR = "./assets";
  const THUMBNAIL_DIR = "./thumbnails";
  const airdrops = fs.readdirSync(AIRDROP_DIR);
  const assetsDir = fs.readdirSync(ASSET_DIR);
  const thumbnailsDir = fs.readdirSync(THUMBNAIL_DIR);

  // 토큰 등록 정보 확인
  console.log("Fetching data from Ethereum");
  const registered: string[] = [];
  for (const filename of airdrops) {
    const tokenId = Number.parseInt(path.basename(filename, ".json"));
    console.log(tokenId);
    const exist = await tnLE.exists(tokenId);
    if (exist) registered.push(filename);
  }

  // 등록할 토큰 확인
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

  // 메타데이터 업데이트
  const metadata = JSON.parse(
    fs.readFileSync(`${METADATA_DIR}/${response.filename}`).toString()
  );

  // 에셋 업로드
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
      name: "test_" + assets[0],
    },
    pinataOptions: {
      cidVersion: 0,
    },
  });

  console.log("Asset Hash: ");
  console.log(result0.IpfsHash);

  metadata.animation_url = "ipfs://" + result0.IpfsHash;

  // 썸네일 업로드
  const thumbnails: string[] = [];

  for (const filename of thumbnailsDir) {
    const tokenId = Number.parseInt(filename.split(".")[0]);
    const num = Number.parseInt(path.basename(response.filename, ".json"));

    if (tokenId === num) thumbnails.push(filename);
  }

  if (thumbnails.length !== 1) throw Error("Thumbnail must be only one.");

  const readableStreamForThumbnail = fs.createReadStream(
    `${THUMBNAIL_DIR}/${thumbnails[0]}`
  );

  const resultForThumbnail = await pinata.pinFileToIPFS(readableStreamForThumbnail, {
    pinataMetadata: {
      name: "test_" + thumbnails[0],
    },
    pinataOptions: {
      cidVersion: 0,
    },
  });

  console.log("Thumbnail Hash: ");
  console.log(resultForThumbnail.IpfsHash);

  metadata.image = "ipfs://" + resultForThumbnail.IpfsHash;


  console.log("Metadata:");
  console.log(metadata);

  // 메타데이터 내용 확인
  const metadataConfirm = await prompts({
    type: "confirm",
    name: "confirm",
    message: "Is metadata ok?",
  });

  if (!metadataConfirm.confirm) throw Error("Reverted by user input. Please check a metadata and try agian.");

  console.log("Write updated metadata...");
  fs.writeFileSync(
    `${METADATA_DIR}/${response.filename}`,
    JSON.stringify(metadata, null, 2)
  );
  console.log("ok");

  const result = await pinata.pinJSONToIPFS(metadata, {
    pinataMetadata: {
      name: "test_" + response.filename,
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
  const tx = await tnLE.newAirdrop(
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
