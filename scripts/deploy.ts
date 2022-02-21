// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
import { LedgerSigner } from "@anders-t/ethers-ledger";
// eslint-disable-next-line camelcase
import { HitchhikerLE__factory } from "../typechain";

async function main() {
  const ledger = new LedgerSigner(ethers.provider);
  const hitchihikerLE = await new HitchhikerLE__factory(ledger).deploy();
  await hitchihikerLE.deployed();

  console.log("HitchhikerLE deployed to:", hitchihikerLE.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
