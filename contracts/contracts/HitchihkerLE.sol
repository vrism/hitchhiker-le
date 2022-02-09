//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract HitchhikerLE is ERC1155Supply, Ownable {
    constructor() ERC1155("") Ownable() {}

    string[] private _uri;
    string public contractURI;
    uint256[] public mintableUntil;
    bytes32[] public airdropRoot;
    mapping(uint256 => mapping(address => uint256)) public claimed;

    event PermanentURI(string _value, uint256 indexed _id);

    function updateContractURI(string memory uri_) public onlyOwner {
        contractURI = uri_;
    }

    function newAirdrop(
        string memory uri_,
        bytes32 merkleRoot,
        uint256 timestamp
    ) public onlyOwner {
        require(timestamp > block.timestamp, "This is not mintable");
        _uri.push(uri_);
        mintableUntil.push(timestamp);
        airdropRoot.push(merkleRoot);
        emit PermanentURI(uri_, _uri.length - 1);
    }

    function claim(
        uint256 id,
        uint256 amount,
        uint256 allowance,
        bytes32[] memory proof
    ) public {
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, allowance));
        require(mintableUntil[id] > block.timestamp, "Not mintable");
        require(
            claimed[id][msg.sender] + amount <= allowance,
            "Already claimed"
        );
        require(
            MerkleProof.verify(proof, airdropRoot[id], leaf),
            "MerkleProof is not valid"
        );
        claimed[id][msg.sender] += amount;
        _mint(msg.sender, id, amount, "");
    }

    function uri(uint256 id) public view override returns (string memory) {
        return _uri[id];
    }
}
