import { solidityKeccak256 } from "ethers/lib/utils";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

export interface AirdropLeaf {
  address: string;
  amount: number;
}

export const leafHash = (data: AirdropLeaf) =>
  solidityKeccak256(["address", "uint256"], [data.address, data.amount]);

export const merkleRoot = (leaves: AirdropLeaf[]) => {
  const merkleTree = new MerkleTree(
    leaves.map((leaf) => leafHash(leaf)),
    keccak256,
    { sort: true }
  );
  const merkleRoot = merkleTree.getHexRoot();
  return merkleRoot;
};

export const merkleProof = (leaves: AirdropLeaf[], address: string) => {
  const merkleTree = new MerkleTree(
    leaves.map((leaf) => leafHash(leaf)),
    keccak256,
    { sort: true }
  );
  const index = leaves.findIndex((l) => l.address === address);
  if (index < 0) throw Error(`Failed to create the merkle proof`);
  const proof = merkleTree.getHexProof(leafHash(leaves[index]));
  return proof;
};
