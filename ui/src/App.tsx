import React from "react";
import { ChainId, DAppProvider, Config, useEthers } from "@usedapp/core";
import { WalletConnectConnector } from "@web3-react/walletconnect-connector";
import { HitchhikerLE__factory, utils } from "contracts";
import logo from "./logo.svg";
import "./App.css";

const config: Config = {
  readOnlyChainId: ChainId.Mainnet,
  readOnlyUrls: {
    [ChainId.Mainnet]:
      process.env.WEB3_API ||
      "https://eth-mainnet.alchemyapi.io/v2/YOUR_API_KEY",
  },
};
const walletconnect = new WalletConnectConnector({
  rpc: {
    1:
      process.env.WEB3_API ||
      "https://eth-mainnet.alchemyapi.io/v2/YOUR_API_KEY",
  },
  qrcode: true,
});

function App() {
  const { activateBrowserWallet, activate, deactivate, library, account } =
    useEthers();
  return (
    <DAppProvider config={config}>
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.tsx</code> and save to reload.
          </p>
          <button onClick={() => activateBrowserWallet()}>Metamask</button>
          <button onClick={() => activate(walletconnect)}>
            Wallet Connect
          </button>
          <button
            onClick={async () => {
              if (!library) {
                alert("Connect wallet first");
                return;
              }
              const signer = library.getSigner();
              const contract = HitchhikerLE__factory.connect(
                process.env.CONTRACT_ADDRESS ||
                  "0x5fbdb2315678afecb367f032d93f642f64180aa3",
                library
              );
              try {
                // TODO: implement merkle proof here
                const proof = utils.merkleProof([], "");
                await contract.connect(signer).claim(0, 0, 0, proof);
              } catch (e) {
                const message = (e as any).error.message;
                alert(message);
              }
            }}
          >
            Mint with sample merkle proof
          </button>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
        </header>
      </div>
    </DAppProvider>
  );
}

export default App;
