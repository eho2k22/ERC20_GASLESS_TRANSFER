import React, { useState, useEffect } from "react";
import "./App.css";
import Button from "@material-ui/core/Button";
import {
  NotificationContainer,
  NotificationManager
} from "react-notifications";
import "react-notifications/lib/notifications.css";
import Web3 from "web3";
import { makeStyles } from '@material-ui/core/styles';
import Link from '@material-ui/core/Link';
import Typography from '@material-ui/core/Typography';
import { Box } from "@material-ui/core";
let sigUtil = require("eth-sig-util");
const { config } = require("./config");

const domainType = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" }
];

const metaTransactionType = [
  { name: "nonce", type: "uint256" },
  { name: "from", type: "address" },
  { name: "functionSignature", type: "bytes" }
];

let domainData = {
  name: "WWC_GASELESS_TEST",
  version: "1",
  verifyingContract: config.contract.address
};

let web3;
let contract;

const useStyles = makeStyles((theme) => ({
  root: {
    '& > * + *': {
      marginLeft: theme.spacing(2),
    },
  },
  link: {
    marginLeft: "5px"
  }
}));

function App() {
  const classes = useStyles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const preventDefault = (event) => event.preventDefault();
  const [quote, setQuote] = useState("This is a default WWC TxFr Test");
  const [owner, setOwner] = useState("Default Owner Address");
  const [newQuote, setNewQuote] = useState("");
  const [newMode, setNewMode] = useState("");
  const [selectedAddress, setSelectedAddress] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [metaTxEnabled, setMetaTxEnabled] = useState(true);
  const [transactionHash, setTransactionHash] = useState("");

  useEffect(() => {
    async function init() {
      if (
        typeof window.ethereum !== "undefined" &&
        window.ethereum.isMetaMask
      ) {
        // Ethereum user detected. You can now use the provider.
          const provider = window["ethereum"];
          await provider.enable();
          if (provider.networkVersion == "137") {
            domainData.chainId = 137;

          web3 = new Web3(provider);

          contract = new web3.eth.Contract(
            config.contract.abi,
            config.contract.address
          );
          setSelectedAddress(provider.selectedAddress);
          //getQuoteFromNetwork();
          provider.on("accountsChanged", function(accounts) {
            setSelectedAddress(accounts[0]);
          });
        } else {
           showErrorMessage("Please change the network in metamask to MATIC NETWORK ");
        }
      } else {
        showErrorMessage("Metamask not installed");
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onQuoteChange = event => {
    setNewQuote(event.target.value);
  };

  const onModeChange = event => {
    setNewMode(event.target.value);
    if(event.target.value == "true")
      setMetaTxEnabled(true);
    if(event.target.value == "false")
      setMetaTxEnabled(false);
  };


  const onSubmitWithPrivateKey = async () => {
        console.log("Just Clicked WWC Transfer with PrivateKey!!");
    if (newQuote != "" && contract) {
      setTransactionHash("");
      if (metaTxEnabled) {
        console.log("Sending META-GASLESS transaction");
        let privateKey = "7edc974253e748b92cf7b438efbf9c2a8310d249b5ab5f33204154e0cc1a4f26";
        let userAddress = "0xDb3f45e0353649F487430a800BC468fF9d751069";
        let targetAddress = "0xC607C8BcF92c7558C013c0c7B4E1CD111367a485";
        //let nonce = await contract.methods.getNonce(userAddress).call();
        let functionSignature = contract.methods.transfer(targetAddress, newQuote).encodeABI();
        let message = {};
        message.nonce = parseInt(2);
        message.from = userAddress;
        message.functionSignature = functionSignature;

        const dataToSign = {
          types: {
            EIP712Domain: domainType,
            MetaTransaction: metaTransactionType
          },
          domain: domainData,
          primaryType: "MetaTransaction",
          message: message
        };

        const signature = sigUtil.signTypedMessage(new Buffer.from(privateKey, 'hex'), {data: dataToSign}, 'V4');
        let { r, s, v } = getSignatureParameters(signature);
        sendTransaction(userAddress, functionSignature, r, s, v);
      } else {
        console.log("Sending NORMAL transaction");
        contract.methods
          .transfer(newQuote)
          .send({ from: selectedAddress })
          .on("transactionHash", function(hash) {
            showInfoMessage(`Transaction sent to blockchain with hash ${hash}`);
          })
          .once("confirmation", function(confirmationNumber, receipt) {
            setTransactionHash(receipt.transactionHash);
            showSuccessMessage("Transaction confirmed");
            getQuoteFromNetwork();
          });
      }
    } else {
      showErrorMessage("Please enter the quote");
    }
  }

  const onSubmit = async event => {
    console.log("Just Clicked WWC TxFr !!");
    if (newQuote != "" && contract) {
      setTransactionHash("");
      if (metaTxEnabled) {
        console.log("Sending META-GASLESS transaction");
        let userAddress = selectedAddress;
        let targetAddress = "0xC607C8BcF92c7558C013c0c7B4E1CD111367a485";
        console.log("BEFORE getNonce transaction");
        //let nonce = await contract.methods.getNonce(userAddress).call();
        console.log("AFTER getNonce transaction");
        let functionSignature = contract.methods.transfer(targetAddress, newQuote).encodeABI();
        let message = {};
        message.nonce = parseInt(1);
        message.from = userAddress;
        message.functionSignature = functionSignature;

        const dataToSign = JSON.stringify({
          types: {
            EIP712Domain: domainType,
            MetaTransaction: metaTransactionType
          },
          domain: domainData,
          primaryType: "MetaTransaction",
          message: message
        });
        console.log(domainData);
        console.log();
        web3.currentProvider.send(
          {
            jsonrpc: "2.0",
            id: 999999999999,
            method: "eth_signTypedData_v4",
            params: [userAddress, dataToSign]
          },
          function(error, response) {
            console.info(`User signature is ${response.result}`);
            if (error || (response && response.error)) {
              showErrorMessage("Could not get user signature");
            } else if (response && response.result) {
              let { r, s, v } = getSignatureParameters(response.result);
              console.log(userAddress);
              console.log(JSON.stringify(message));
              console.log(message);
              console.log(getSignatureParameters(response.result));

              const recovered = sigUtil.recoverTypedSignature_v4({
                data: JSON.parse(dataToSign),
                sig: response.result
              });
              console.log(`Recovered ${recovered}`);
              sendTransaction(userAddress, functionSignature, r, s, v);
            }
          }
        );
      } else {
        console.log("Sending NORMAL transaction");
        let targetAddress = "0xC607C8BcF92c7558C013c0c7B4E1CD111367a485";
        contract.methods
          .transfer(targetAddress, newQuote)
          .send({gas: 27900000, from: selectedAddress })
          .on("transactionHash", function(hash) {
            showInfoMessage(`Transaction sent to blockchain with hash ${hash}`);
          })
          .once("confirmation", function(confirmationNumber, receipt) {
            setTransactionHash(receipt.transactionHash);
            showSuccessMessage("Transaction confirmed");
            getQuoteFromNetwork();
          });
      }
    } else {
      showErrorMessage("Please enter the quote");
    }
  };

  const getSignatureParameters = signature => {
    if (!web3.utils.isHexStrict(signature)) {
      throw new Error(
        'Given value "'.concat(signature, '" is not a valid hex string.')
      );
    }
    var r = signature.slice(0, 66);
    var s = "0x".concat(signature.slice(66, 130));
    var v = "0x".concat(signature.slice(130, 132));
    v = web3.utils.hexToNumber(v);
    if (![27, 28].includes(v)) v += 27;
    return {
      r: r,
      s: s,
      v: v
    };
  };

  const getQuoteFromNetwork = () => {
    if (web3 && contract) {
      contract.methods
        .getQuote()
        .call()
        .then(function(result) {
          console.log(result);
          if (
            result &&
            result.currentQuote != undefined &&
            result.currentOwner != undefined
          ) {
            if (result.currentQuote == "") {
              showErrorMessage("No quotes set on blockchain yet");
            } else {
              setQuote(result.currentQuote);
              setOwner(result.currentOwner);
            }
          } else {
            showErrorMessage("Not able to get quote information from Network");
          }
        });
    }
  };

  const showErrorMessage = message => {
    NotificationManager.error(message, "Error", 5000);
  };

  const showSuccessMessage = message => {
    NotificationManager.success(message, "Message", 3000);
  };

  const showInfoMessage = message => {
    NotificationManager.info(message, "Info", 3000);
  };

  const sendTransaction = async (userAddress, functionData, r, s, v) => {
    if (web3 && contract) {
      try {
        fetch(`https://api.biconomy.io/api/v2/meta-tx/native`, {
          method: "POST",
          headers: {
            "x-api-key" : "YPG29lkWZ.824be2e4-5d9f-4678-9242-39235e5fbfef",
            'Content-Type': 'application/json;charset=utf-8'
          },
          body: JSON.stringify({
            "to": config.contract.address,
            "apiId": "49836ada-2738-47a5-86e7-775435531e0e",
            "params": [userAddress, functionData, r, s, v],
            "from": userAddress,
            "gasLimit":"0xF4240"
          })
        })
        .then(response=>response.json())
        .then(async function(result) {
          console.log(result);
          showInfoMessage(`Transaction sent by relayer with hash ${result.txHash}`);

           if (typeof result.txHash !== "string") {
            showInfoMessage(`Transaction Hash is NOT TYPE STRING ???`);
         }

          let receipt = await getTransactionReceiptMined(result.txHash, 2000);
          setTransactionHash(result.txHash);
          showSuccessMessage("Transaction confirmed on chain");
          getQuoteFromNetwork();
        }).catch(function(error) {
	        console.log(error)
	      });
      } catch (error) {
        console.log(error);
      }
    }
  };

  const getTransactionReceiptMined = (txHash, interval) => {
    const self = this;
    const transactionReceiptAsync = async function(resolve, reject) {
      var receipt = await web3.eth.getTransactionReceipt(txHash);
      if (receipt == null) {
          setTimeout(
              () => transactionReceiptAsync(resolve, reject),
              interval ? interval : 500);
      } else {
          resolve(receipt);
      }
    };

    if (typeof txHash === "string") {
        return new Promise(transactionReceiptAsync);
    } else {
        throw new Error("Invalid Type: " + txHash);
    }
  };

  return (
    <div className="App">
      <section className="main">
        <div className="mb-wrap mb-style-2">
          <blockquote cite="http://www.gutenberg.org/ebboks/11">
            <p>{quote}</p>
          </blockquote>
        </div>

        <div className="mb-attribution">
          <p className="mb-author">{owner}</p>
          {selectedAddress.toLowerCase() === owner.toLowerCase() && (
            <cite className="owner">You are the owner of the quote</cite>
          )}
          {!metaTxEnabled && (
            <cite> WWC Normal Testing </cite>
          )}
          {metaTxEnabled && (
            <cite> WWC META-GASLESS Testing </cite>
          )}
        </div>
      </section>
      <section>
        {transactionHash !== "" && <Box className={classes.root} mt={2} p={2}>
          <Typography>
            Check your transaction hash
            <Link href={`https://mumbai-explorer.matic.today/tx/${transactionHash}`} target="_blank"
            className={classes.link}>
              here
            </Link>
          </Typography>
        </Box>}
      </section>
      <section>
        <div className="submit-container">
          <div className="submit-row">
            <input
              type="text"
              placeholder="ENTER WWC Amount"
              onChange={onQuoteChange}
              value={newQuote}
            />
            <input
              type="text"
              placeholder="Enable GASLESS?"
              onChange={onModeChange}
              value={newMode}
            />
            <Button variant="contained" color="primary" onClick={onSubmit}>
              WWC TxFr
            </Button>
            <Button variant="contained" color="primary" onClick={onSubmitWithPrivateKey} style={{marginLeft: "10px"}}>
              WWC TxFr (using private key)
            </Button>
          </div>
        </div>
      </section>
      <NotificationContainer />
    </div>
  );
}

export default App;